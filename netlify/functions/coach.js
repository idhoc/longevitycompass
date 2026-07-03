// Two-stage coaching pipeline:
//   Stage 1 (ChatGPT): reads the topic's source library + the system prompt, produces a
//     grounded "Do this / Why / Watch for" style answer in plain text.
//   Stage 2 (Claude): takes ONLY that stage-1 text and reshapes it into strict JSON for the
//     UI. It is explicitly told not to add, remove, or alter any factual claim — restructure
//     only. This mirrors the "ChatGPT grounds, Claude distills" design agreed on with the
//     user, and keeps the two jobs (research fidelity vs. presentation) separated.
//
// Safety notes:
//   - API keys are read from environment variables and never sent to the client.
//   - A local, deterministic red-flag check runs BEFORE either LLM call, as defense-in-depth
//     alongside the model's own Section 5 escalation logic (never rely on a single layer).
//   - If OPENAI_API_KEY / ANTHROPIC_API_KEY are unset, each stage falls back to a clearly
//     labeled mock response so the rest of the app is testable without live keys/cost.

const bundle = require('./lib/sources-bundle.json');

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const ANTHROPIC_VERSION = '2023-06-01';

const ESCALATION_MARKERS = [
  'outside wellness coaching',
  'licensed professional',
  'emergency services',
  'contact a doctor',
  'contact a licensed',
];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const { topicId, profile } = body;
  const topic = bundle.topics.find((t) => t.id === topicId);
  if (!topic) {
    return respond(400, { error: `Unknown topicId: ${topicId}` });
  }

  const localFlag = checkLocalRedFlags(profile || {});
  if (localFlag) {
    return respond(200, {
      topicId,
      escalation: true,
      message: localFlag,
    });
  }

  const sourceText = topic.sources
    .map((id) => bundle.sources[id])
    .join('\n\n---\n\n');

  const systemPrompt = [
    bundle.systemPrompt,
    '',
    '## 10. Source Library for This Turn',
    '',
    `Topic: ${topic.label}`,
    '',
    `Emphasis: ${topic.emphasis}`,
    '',
    sourceText,
  ].join('\n');

  const userMessage = buildUserMessage(topic, profile || {});

  let stage1Text;
  try {
    stage1Text = await callOpenAI(systemPrompt, userMessage);
  } catch (err) {
    return respond(502, { error: `Stage 1 (grounding) failed: ${err.message}` });
  }

  if (ESCALATION_MARKERS.some((marker) => stage1Text.toLowerCase().includes(marker))) {
    return respond(200, {
      topicId,
      escalation: true,
      message: stage1Text.trim(),
    });
  }

  let structured;
  try {
    structured = await callClaudeDistill(stage1Text);
  } catch (err) {
    console.error('Stage 2 (distill) failed, falling back to naive parse:', err.message);
    structured = naiveFallbackParse(stage1Text);
  }

  return respond(200, {
    topicId,
    escalation: false,
    generatedAt: new Date().toISOString(),
    headline: structured.headline || null,
    doThis: structured.do_this || null,
    why: structured.why || null,
    evidence: Array.isArray(structured.evidence) ? structured.evidence : [],
    watchFor: structured.watch_for || null,
    raw: stage1Text,
  });
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// Defense-in-depth: a small set of the Section 5 thresholds checked locally, in addition to
// (never instead of) the model's own escalation logic. Anything not caught here still has to
// pass through the system prompt's Section 2 red-flag scan.
function checkLocalRedFlags(profile) {
  const hr = toFiniteOrNull(profile.restingHeartRate);
  if (hr !== null && (hr > 100 || hr < 40)) {
    return "A resting heart rate outside 40–100 bpm is outside wellness coaching — please contact a licensed professional to review this. If you're experiencing symptoms right now, contact emergency services.";
  }
  const sys = toFiniteOrNull(profile.systolicBP);
  const dia = toFiniteOrNull(profile.diastolicBP);
  if ((sys !== null && sys >= 180) || (dia !== null && dia >= 120)) {
    return 'Blood pressure in this range is outside wellness coaching — please contact a licensed professional or emergency services now.';
  }
  if (profile.chestPain === true) {
    return 'Chest pain is outside wellness coaching — please contact emergency services or a licensed professional now.';
  }
  if (profile.suicidalIdeation === true) {
    return 'This is outside wellness coaching. Please contact a licensed professional now, or a crisis line/emergency services if you are in immediate danger.';
  }
  return null;
}

function buildUserMessage(topic, profile) {
  const lines = Object.entries(profile)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `- ${labelize(k)}: ${Array.isArray(v) ? v.join(', ') : v}`);
  return [
    "Here is the user's current profile:",
    lines.length ? lines.join('\n') : '(no profile data provided)',
    '',
    `Build today's action plan for ${topic.label}.`,
  ].join('\n');
}

function toFiniteOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function labelize(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

async function callOpenAI(systemPrompt, userMessage) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return mockStage1(userMessage);
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callClaudeDistill(stage1Text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return mockDistill(stage1Text);
  }

  const instruction = [
    'You will restructure the coach response below into STRICT JSON only — no prose, no markdown fences.',
    'Schema: {"headline": string|null, "do_this": string|null, "why": string|null, "evidence": [{"text": string, "type": "figure"|"limitation"}], "watch_for": string|null}',
    'Rules:',
    '- Do NOT add, remove, soften, or invent any fact. Restructure and compress only.',
    '- "headline": a punchy, memorable, <=6-word imperative title that restates "do_this" — e.g. "Do this: After plating dinner, add one fiber-rich food you did not eat earlier today" -> "Add One Fiber Food Tonight". It must be a compression of do_this, never a new claim or a different action.',
    '- Split the "Why" section: pull out sentences that contain a number, percentage, or named study/timeframe as separate "evidence" entries with type "figure".',
    '- Any sentence containing "does not show", "does not prove", "does not establish", or similar hedges goes into "evidence" with type "limitation".',
    '- If a field is absent in the source text, use null (or [] for evidence).',
    '- Output ONLY the JSON object, nothing else.',
    '',
    'Coach response to restructure:',
    '"""',
    stage1Text,
    '"""',
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 800,
      temperature: 0,
      messages: [{ role: 'user', content: instruction }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() || '';
  return parseJsonLoose(text);
}

function parseJsonLoose(text) {
  const cleaned = text.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

// Used only when a real stage-1 response exists but Claude's JSON call fails/is unavailable:
// splits on the prompt's own "Do this: / Why: / Watch for:" labels so the UI never breaks.
function naiveFallbackParse(text) {
  const pick = (label, stops) => {
    const stopPattern = stops.map((s) => `${s}:`).join('|');
    const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=(?:${stopPattern}):|$)`, 'i');
    const m = text.match(re);
    return m ? m[1].trim() : null;
  };
  const doThis = pick('Do this', ['Why', 'Watch for']);
  return {
    headline: null,
    do_this: doThis,
    why: pick('Why', ['Watch for']),
    evidence: [],
    watch_for: pick('Watch for', []),
  };
}

function mockStage1(userMessage) {
  return [
    '[MOCK — OPENAI_API_KEY not set]',
    'Do this: After your next meal, add one fiber-rich food you did not eat earlier today.',
    'Why: The uploaded source library associates diverse fiber intake with improved SCFA production and healthier aging markers (mock data — set OPENAI_API_KEY for a real, grounded response).',
    'Watch for: This is placeholder content and is not grounded in your actual research library.',
  ].join('\n');
}

function mockDistill(stage1Text) {
  return {
    headline: '[MOCK] Add One Fiber Food',
    do_this: '[MOCK — ANTHROPIC_API_KEY not set] After your next meal, add one fiber-rich food you did not eat earlier today.',
    why: 'This is a mock distillation. Set ANTHROPIC_API_KEY to get a real Stage 2 response.',
    evidence: [{ text: stage1Text.slice(0, 200), type: 'limitation' }],
    watch_for: null,
  };
}
