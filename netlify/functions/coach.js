// Two-stage coaching pipeline:
//   Stage 1 (ChatGPT): reads the topic's source library + the system prompt, produces a
//     grounded "Do this / Why / Watch for" style answer in plain text.
//   Stage 2 (Claude): takes ONLY that stage-1 text and reshapes it into structured data for
//     the UI, via forced tool-use (not "please write JSON as text" — that's fragile and was
//     the root cause of blank plan cards in production: any stray markdown or formatting
//     quirk from Stage 1 could break a text-based JSON.parse). Tool-use makes the Anthropic
//     API itself guarantee a schema-valid object — there is no JSON string to parse or fail
//     on. Claude is explicitly told not to add, remove, or alter any factual claim —
//     restructure and de-markdown only.
//
// Safety notes:
//   - API keys are read from environment variables and never sent to the client.
//   - A local, deterministic red-flag check runs BEFORE either LLM call, as defense-in-depth
//     alongside the model's own Section 5 escalation logic (never rely on a single layer).
//   - If OPENAI_API_KEY / ANTHROPIC_API_KEY are unset, each stage falls back to a clearly
//     labeled mock response so the rest of the app is testable without live keys/cost.
//   - Even in the worst case (Stage 2 totally unavailable), the fallback parser guarantees
//     the user sees the real Stage 1 content — never a blank card.

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

const FORMAT_TOOL = {
  name: 'format_plan',
  description: "Return the coach's response restructured for a UI card. Restructuring and removing markdown syntax is allowed; changing, adding, or softening any factual content is not.",
  input_schema: {
    type: 'object',
    properties: {
      headline: {
        type: 'string',
        description: 'A punchy, memorable, <=6-word imperative title that compresses do_this. E.g. "After plating dinner, add one fiber-rich food" -> "Add One Fiber Food Tonight". Never a new claim.',
      },
      do_this: {
        type: 'string',
        description: 'The single tiny action, plain text, no markdown, no leading label.',
      },
      why: {
        type: 'string',
        description: 'The explanatory sentence(s) tying the action to the source claim, plain text, no markdown.',
      },
      evidence: {
        type: 'array',
        description: 'Sentences from "why" that contain a number/percentage/named study/timeframe (type "figure"), or a hedge like "does not show/prove/establish" (type "limitation"). Empty array if none.',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            type: { type: 'string', enum: ['figure', 'limitation'] },
          },
          required: ['text', 'type'],
        },
      },
      watch_for: {
        type: ['string', 'null'],
        description: 'Only if the source text has a real caution to flag; otherwise null. Plain text, no markdown.',
      },
      eat: {
        type: 'array',
        description: 'Only present if the response has an "Eat:" line, formatted as semicolon-separated items like "Food (quantity): reason". One array entry per item — "food" is the name plus any parenthetical quantity, "detail" is the reason after the colon, verbatim, no invented numbers. Empty array if there is no "Eat:" line.',
        items: {
          type: 'object',
          properties: { food: { type: 'string' }, detail: { type: 'string' } },
          required: ['food', 'detail'],
        },
      },
      avoid: {
        type: 'array',
        description: 'Same shape and parsing as "eat", from the "Avoid:" line. Empty array if there is no "Avoid:" line, or it says "none specified".',
        items: {
          type: 'object',
          properties: { food: { type: 'string' }, detail: { type: 'string' } },
          required: ['food', 'detail'],
        },
      },
    },
    required: ['headline', 'do_this', 'why', 'evidence', 'watch_for', 'eat', 'avoid'],
  },
};

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

  const formattingRules = [
    'Plain text only. Do not use markdown syntax of any kind — no **bold**, no *italics*, no # headers, no bullet dashes. Write "Do this:", "Why:", and "Watch for:" as plain labels on their own line, exactly that spelling, followed by the content on the same line.',
    'Whenever the source library gives a specific number for the action you are recommending — grams, a percentage, a frequency, a timeframe — state that exact number. Never write "more," "some," or "a bit" when the source has already told you how much. If the source genuinely gives no number for this specific action, say so plainly rather than inventing one.',
  ];

  if (topic.foodRelevant) {
    formattingRules.push(
      'This topic involves specific foods. After Watch for (or after Why, if there is no Watch for), add exactly two more lines, each a single line (no line breaks within it):',
      'Eat: 3-5 items separated by " ; ", each item formatted as "Food name (quantity or frequency if the source states one): one-line reason" — e.g. "Eat: Lentils (about 1/2 cup): ferments into propionate, which supports satiety signaling ; Oats (about 1/2 cup dry): a strong resistant-starch source for SCFA-producing bacteria." If the source gives no quantity for an item, drop the parenthetical rather than inventing one; never drop the reason.',
      'Avoid: 2-4 items in the exact same format, but only foods the source specifically names as something to limit (e.g. refined carbohydrates, excess sodium, ultra-processed food). If the source does not call out anything to avoid for this specific topic, write exactly "Avoid: none specified" — do not invent a caution the source doesn\'t support.'
    );
  }

  const systemPrompt = [
    bundle.systemPrompt,
    '',
    '## 10. Source Library for This Turn',
    '',
    `Topic: ${topic.label}`,
    '',
    `Emphasis: ${topic.emphasis}`,
    '',
    '## 11. Output Formatting for This Turn',
    '',
    ...formattingRules,
    '',
    sourceText,
  ].join('\n');

  const userMessage = buildUserMessage(topic, profile || {});

  let stage1Text;
  try {
    stage1Text = await callOpenAI(systemPrompt, userMessage, topic.foodRelevant);
  } catch (err) {
    return respond(502, { error: `Stage 1 (grounding) failed: ${err.message}` });
  }

  if (!stage1Text.trim()) {
    return respond(502, { error: 'Stage 1 (grounding) returned an empty response. Try again.' });
  }

  if (ESCALATION_MARKERS.some((marker) => stage1Text.toLowerCase().includes(marker))) {
    return respond(200, {
      topicId,
      escalation: true,
      message: stripMarkdown(stage1Text).trim(),
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
    eat: Array.isArray(structured.eat) ? structured.eat : [],
    avoid: Array.isArray(structured.avoid) ? structured.avoid : [],
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

// Strips markdown syntax so plain-text UI never shows literal **/##/- characters, regardless
// of which code path (tool-use success or naive fallback) produced the string.
function stripMarkdown(s) {
  if (!s) return s;
  return s
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/`([^`]*)`/g, '$1')
    .trim();
}

async function callOpenAI(systemPrompt, userMessage, foodRelevant) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return mockStage1(userMessage, foodRelevant);
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
      max_tokens: 600,
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
    "Restructure the coach response below by calling the format_plan tool.",
    'Do NOT add, remove, soften, or invent any fact — restructure, split, and strip markdown formatting only.',
    'If the response has an "Eat:" and/or "Avoid:" line (semicolon-separated items like "Food (quantity): reason"), split each on " ; " then split each item on the first ":" into food vs. detail. If a line is absent, or Avoid says "none specified", return an empty array for it.',
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
      tools: [FORMAT_TOOL],
      tool_choice: { type: 'tool', name: 'format_plan' },
      messages: [{ role: 'user', content: instruction }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use' && b.name === 'format_plan');
  if (!toolUse || !toolUse.input) {
    throw new Error('Anthropic response had no format_plan tool_use block');
  }
  return sanitizeStructured(toolUse.input);
}

function sanitizeStructured(input) {
  const cleanItems = (arr) => (Array.isArray(arr)
    ? arr.map((e) => ({ food: stripMarkdown(e.food || ''), detail: stripMarkdown(e.detail || '') })).filter((e) => e.food)
    : []);
  return {
    headline: stripMarkdown(input.headline || ''),
    do_this: stripMarkdown(input.do_this || ''),
    why: stripMarkdown(input.why || ''),
    evidence: Array.isArray(input.evidence)
      ? input.evidence.map((e) => ({ text: stripMarkdown(e.text || ''), type: e.type === 'limitation' ? 'limitation' : 'figure' }))
      : [],
    watch_for: input.watch_for ? stripMarkdown(input.watch_for) : null,
    eat: cleanItems(input.eat),
    avoid: cleanItems(input.avoid),
  };
}

// Last-resort path — used only when Stage 2 (Claude) is unavailable or errors. Tries the
// prompt's own "Do this: / Why: / Watch for:" labels first (tolerant of stray markdown around
// them); if that structure genuinely isn't present, it NEVER returns everything empty — the
// full cleaned Stage 1 text becomes the "why" so the user always sees real content, and a short
// derived line becomes "do_this", rather than a blank card with just a generic headline.
function naiveFallbackParse(text) {
  const cleaned = stripMarkdown(text);
  const pick = (label, stops) => {
    // NOTE: stops must NOT include the trailing colon here — it's added once in the lookahead
    // below. A previous version appended ":" to each stop AND in the lookahead, producing
    // "(?:Why:|Watch for:):" which requires a literal double colon and can never match —
    // that silently broke every fallback parse, letting "do_this" swallow the entire rest
    // of the text (including the Why/Watch for sections) instead of stopping at them.
    const stopPattern = stops.join('|');
    const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=(?:${stopPattern}):|$)`, 'i');
    const m = cleaned.match(re);
    return m ? m[1].trim() : null;
  };
  const doThis = pick('Do this', ['Why', 'Watch for', 'Eat', 'Avoid']);
  const why = pick('Why', ['Watch for', 'Eat', 'Avoid']);
  const watchFor = pick('Watch for', ['Eat', 'Avoid']);
  const eatLine = pick('Eat', ['Avoid']);
  const avoidLine = pick('Avoid', []);
  // Expected shape: "Food (quantity): reason ; Food2 (quantity): reason2 ; ..."
  const parseFoodItems = (line) => {
    if (!line || /^none specified$/i.test(line.trim())) return [];
    return line.split(/\s*;\s*/).map((item) => item.trim()).filter(Boolean).map((item) => {
      const idx = item.indexOf(':');
      return idx === -1
        ? { food: item, detail: '' }
        : { food: item.slice(0, idx).trim(), detail: item.slice(idx + 1).trim() };
    }).filter((e) => e.food);
  };

  if (doThis || why) {
    return { headline: null, do_this: doThis, why, evidence: [], watch_for: watchFor, eat: parseFoodItems(eatLine), avoid: parseFoodItems(avoidLine) };
  }

  // No recognizable labels at all — surface the raw content rather than nothing.
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  return {
    headline: null,
    do_this: sentences[0] || cleaned.slice(0, 140) || null,
    why: sentences.slice(1).join(' ') || null,
    evidence: [],
    watch_for: null,
    eat: [],
    avoid: [],
  };
}

function mockStage1(userMessage, foodRelevant) {
  const lines = [
    '[MOCK — OPENAI_API_KEY not set]',
    'Do this: After your next meal, add one 1/2-cup serving of a fiber-rich food you did not eat earlier today — beans, lentils, oats, or a whole grain.',
    'Why: The uploaded source library associates a roughly 25g/day increase in fiber intake with measurable microbiome changes within two weeks, and links diverse fiber sources to improved SCFA production and healthier aging markers (mock data — set OPENAI_API_KEY for a real, grounded response).',
    'Watch for: This is placeholder content and is not grounded in your actual research library.',
  ];
  if (foodRelevant) {
    lines.push(
      'Eat: Lentils (about 1/2 cup): ferments into propionate, which supports satiety and metabolic signaling ; Oats (about 1/2 cup dry): a strong resistant-starch source for SCFA-producing bacteria ; Cooled potatoes or rice (a few times per week): resistant starch forms on cooling, feeding beneficial microbes.',
      'Avoid: Ultra-processed low-fiber snacks: displacing fiber sources reduces substrate for SCFA production.'
    );
  }
  return lines.join('\n');
}

function mockDistill(stage1Text) {
  const foodRelevant = stage1Text.includes('\nEat:');
  return {
    headline: '[MOCK] Add One Fiber Serving',
    do_this: '[MOCK — ANTHROPIC_API_KEY not set] After your next meal, add one 1/2-cup serving of a fiber-rich food you did not eat earlier today — beans, lentils, oats, or a whole grain.',
    why: 'This is a mock distillation. Set ANTHROPIC_API_KEY to get a real Stage 2 response. The uploaded source library associates a roughly 25g/day increase in fiber intake with measurable microbiome changes within two weeks.',
    evidence: [{ text: stage1Text.slice(0, 160), type: 'limitation' }],
    watch_for: null,
    eat: foodRelevant ? [
      { food: 'Lentils', detail: 'about 1/2 cup — ferments into propionate, which supports satiety and metabolic signaling.' },
      { food: 'Oats', detail: 'about 1/2 cup dry — a strong resistant-starch source for SCFA-producing bacteria.' },
      { food: 'Cooled potatoes or rice', detail: 'a few times per week — resistant starch forms on cooling, feeding beneficial microbes.' },
    ] : [],
    avoid: foodRelevant ? [
      { food: 'Ultra-processed low-fiber snacks', detail: 'displacing fiber sources reduces substrate for SCFA production.' },
    ] : [],
  };
}
