// Two-stage coaching pipeline:
//   Stage 1 (ChatGPT): reads the topic's source library + the system prompt, produces a
//     grounded "Do this / Why / Watch for" style answer in plain text. Since this deployment
//     (see Section 12 below), Stage 1 may also use OpenAI's hosted web search, restricted by
//     prompt to a domain allowlist (NIH/PubMed/CDC/WHO/major universities/journals) — the
//     static library remains the primary source; web search fills genuine gaps (thin topics
//     like Sleep/Activity) rather than replacing it.
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
//   - Web search (Section 12) is restricted by prompt to named credible domains and is never
//     the ONLY grounding — it supplements the curated library, and every web-sourced claim
//     must be labeled as such, distinct from library claims. If the OpenAI Responses API call
//     (which carries the web-search tool) fails for any reason — wrong model, API drift, rate
//     limit — this falls back to the plain Chat Completions call rather than erroring out.

const bundle = require('./lib/sources-bundle.json');

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_WEB_SEARCH_MODEL = process.env.OPENAI_WEB_SEARCH_MODEL || 'gpt-4o';
const WEB_SEARCH_ENABLED = process.env.ENABLE_WEB_SEARCH !== 'false';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const ANTHROPIC_VERSION = '2023-06-01';
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'tts-1';
const TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

const ESCALATION_MARKERS = [
  'outside wellness coaching',
  'licensed professional',
  'emergency services',
  'contact a doctor',
  'contact a licensed',
];

const TRUSTED_DOMAINS_TEXT = 'government health agencies (nih.gov, ncbi.nlm.nih.gov/pubmed, cdc.gov, who.int, fda.gov, medlineplus.gov), academic/medical institutions (harvard.edu, health.harvard.edu, mayoclinic.org, stanford.edu, hopkinsmedicine.org, clevelandclinic.org, and similar .edu or major nonprofit hospital domains), and peer-reviewed journals or their DOI/PubMed pages (nature.com, nejm.org, jamanetwork.com, thelancet.com, bmj.com, cell.com, cell.com/cell-metabolism, sciencedirect.com)';

const COACH_TONES = {
  direct: 'Coaching tone for this response: DIRECT. Skip preamble and hedging. Lead with the instruction in the first sentence. Short sentences. No motivational framing.',
  encouraging: 'Coaching tone for this response: ENCOURAGING. Open by acknowledging effort or progress before the instruction. Frame any low adherence as normal and recoverable, never as failure. Still concise — warmth is not verbosity.',
  clinical: 'Coaching tone for this response: CLINICAL. Lead with the mechanism or evidence before the instruction, as a clinician explaining rationale would. Use precise physiological terminology where the source supports it. Minimal motivational language.',
};

// The actual "how the AI coaches" rewrite (not a tweak): Motivational Interviewing (MI) is the
// real, evidence-based counseling method behind apps like Thrive AI Health Coach (their own
// materials describe "AI-Driven MI" specifically) — collaborative, evokes the person's own
// motivation instead of lecturing them, reflects their situation back before advising. This
// replaces the earlier generic "helpful assistant" framing everywhere a coaching turn happens.
const MI_STYLE_TEXT = [
  'Coach using Motivational Interviewing (MI), the same evidence-based method professional health coaches are trained in — not a search engine reciting facts. Concretely, every turn:',
  '1) REFLECT before you ADVISE. If the profile or conversation gives you something specific to reflect (their stated goal, an actual number like sleep hours or adherence %, something they said), open by reflecting it back in one sentence, so the response reads as written for this specific person, not templated. Never open with a generic hook like "Did you know..." or "Studies show...".',
  '2) ONE invitation, not a command. Frame the action as something to try, not an order — "one option that fits what you told me is..." rather than "you must...". The person stays in control of whether to take it.',
  '3) Use their own numbers. If you have their actual profile values (age, adherence, sleep hours, resting heart rate, etc.), cite the specific number, not a vague quantifier ("more," "some," "regularly").',
  '4) Affirm before correcting. If adherence is low or they are just starting, name the effort of showing up at all before anything else — MI calls this affirming; skipping it reads as judgmental, which is the single most common complaint about AI health tools.',
  '5) Sound like one specific, warm, competent person talking, once — not a listicle, not a wall of hedges. Still follow every grounding/evidence rule above; MI changes the delivery, never the facts.',
].join(' ');

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
      personalization_note: {
        type: ['string', 'null'],
        description: 'One sentence, MI-style reflection of why THIS action fits THIS user right now — reference their actual stated goal, adherence number, or a specific profile fact if the source text/context gives you one. Null only if truly nothing in the context supports a personalized reflection (e.g. an empty profile). Never invent a fact to fill this in.',
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
        description: 'Sentences from "why" (and any web-sourced claims) that contain a number/percentage/named study/timeframe, or a hedge like "does not show/prove/establish". Empty array if none.',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            type: { type: 'string', enum: ['figure', 'limitation'] },
            strength: {
              type: 'string',
              enum: ['strong', 'moderate', 'preliminary'],
              description: 'Infer from the language used: "strong" for meta-analyses/systematic reviews/large cohorts (tens of thousands+ participants); "moderate" for a single named study, RCT, or moderate-size cohort; "preliminary" for pre-clinical, animal, in-vitro, or purely mechanistic claims.',
            },
            source_quote: {
              type: ['string', 'null'],
              description: 'If this sentence contains a phrase in quotation marks, extract it verbatim here. Otherwise null. Never invent a quote.',
            },
          },
          required: ['text', 'type', 'strength', 'source_quote'],
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
      steps: {
        type: 'array',
        description: 'Only if the response has a "Steps:" line (a naturally sequential, timed action like breathing, a stretch routine, or a walk warm-up/cool-down), formatted as semicolon-separated items like "Label (seconds)". Split each into {label, seconds}. Empty array if there is no "Steps:" line — most actions are a single instruction, not a sequence, and should NOT be forced into steps.',
        items: {
          type: 'object',
          properties: { label: { type: 'string' }, seconds: { type: 'number' } },
          required: ['label', 'seconds'],
        },
      },
    },
    required: ['headline', 'personalization_note', 'do_this', 'why', 'evidence', 'watch_for', 'eat', 'avoid', 'steps'],
  },
};

const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o';

// Conversational onboarding — replaces the old form-first wizard with a short, adaptive,
// MI-style conversation (Google Health Coach's onboarding works the same way: goals, routine,
// lifestyle, constraints, gathered conversationally rather than via a static form). The model
// decides per turn whether it has enough to stop, and the user can end it at any point.
const INTAKE_TOOL = {
  name: 'intake_turn',
  description: 'Return the next step of a short, warm onboarding conversation with a brand-new user.',
  input_schema: {
    type: 'object',
    properties: {
      done: {
        type: 'boolean',
        description: 'true once you have a real goal plus at least two lifestyle facts, OR you have asked 4 of your own questions, OR the user asked to stop/skip/use the form instead. false otherwise.',
      },
      message: {
        type: 'string',
        description: 'If done=false: your next single warm follow-up question — ONE question only, conversational, MI-style (reflect what they just said, then ask), plain text, no markdown. If done=true: a short 1-2 sentence warm closing acknowledgment, plain text.',
      },
      extracted: {
        type: 'object',
        description: 'Best-effort structured extraction from the WHOLE conversation so far. Empty string for any field genuinely not mentioned — never invent or assume.',
        properties: {
          primaryGoal: { type: 'string' },
          dietPattern: { type: 'string' },
          activityLevel: { type: 'string', description: 'One of: sedentary, light, moderate, active — your best mapping of what they described, or empty string.' },
          sleepHours: { type: 'string' },
          stressLevel: { type: 'string', description: 'One of: low, moderate, high — or empty string.' },
          mainStressor: { type: 'string' },
          selfDescription: { type: 'string', description: 'A 1-3 sentence natural-language summary of who this person is and what they want, in their own words/spirit — this personalizes every future response beyond the structured fields above.' },
        },
        required: ['primaryGoal', 'dietPattern', 'activityLevel', 'sleepHours', 'stressLevel', 'mainStressor', 'selfDescription'],
      },
    },
    required: ['done', 'message', 'extracted'],
  },
};

const MEAL_FORMAT_TOOL = {
  name: 'format_meal',
  description: "Structure a meal-photo analysis for a UI card. Restructuring only — never invent a food that wasn't actually described as visible in the photo.",
  input_schema: {
    type: 'object',
    properties: {
      foods: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            estimated_grams: { type: ['number', 'null'] },
            estimated_calories: { type: ['number', 'null'] },
          },
          required: ['name', 'estimated_grams', 'estimated_calories'],
        },
      },
      total_calories_estimate: { type: ['number', 'null'] },
      protein_g: { type: ['number', 'null'] },
      carbs_g: { type: ['number', 'null'] },
      fat_g: { type: ['number', 'null'] },
      suggestion: {
        type: 'string',
        description: 'One specific, grounded suggestion tied to a real mechanism (fiber/gut microbiome, protein/satiety signaling, etc.) relevant to what is actually in the photo — never generic ("eat healthier").',
      },
      confidence: {
        type: 'string',
        enum: ['low', 'moderate'],
        description: 'Photo-based portion/calorie estimates are never high-confidence. Use "moderate" only for a clear, well-lit, single-plate photo with recognizable, common portions; "low" otherwise.',
      },
    },
    required: ['foods', 'total_calories_estimate', 'protein_g', 'carbs_g', 'fat_g', 'suggestion', 'confidence'],
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

  const localFlag = checkLocalRedFlags(body.profile || {});
  if (localFlag) {
    return respond(200, { topicId: body.topicId || null, escalation: true, message: localFlag });
  }

  if (body.mode === 'global') {
    return handleGlobalChat(body);
  }
  if (body.mode === 'synthesis') {
    return handleSynthesis(body);
  }
  if (body.mode === 'briefing') {
    return handleBriefing(body);
  }
  if (body.mode === 'mealPhoto') {
    return handleMealPhoto(body);
  }
  if (body.mode === 'intake') {
    return handleIntake(body);
  }
  if (body.mode === 'speech') {
    return handleSpeech(body);
  }

  const { topicId, profile } = body;
  const topic = bundle.topics.find((t) => t.id === topicId);
  if (!topic) {
    return respond(400, { error: `Unknown topicId: ${topicId}` });
  }

  if (body.mode === 'followup') {
    return handleFollowup(topic, body);
  }

  return handlePlanRequest(topic, body);
};

async function handlePlanRequest(topic, body) {
  const { topicId, profile } = body;
  const context = body.context || {};
  const systemPrompt = buildSystemPrompt(topic, context);
  const userMessage = buildUserMessage(topic, profile || {}, context);

  let stage1;
  try {
    stage1 = await callOpenAI(systemPrompt, userMessage, topic.foodRelevant, context.allowWebSearch);
  } catch (err) {
    return respond(502, { error: `Stage 1 (grounding) failed: ${err.message}` });
  }

  if (!stage1.text.trim()) {
    return respond(502, { error: 'Stage 1 (grounding) returned an empty response. Try again.' });
  }

  if (ESCALATION_MARKERS.some((marker) => stage1.text.toLowerCase().includes(marker))) {
    return respond(200, { topicId, escalation: true, message: stripMarkdown(stage1.text).trim() });
  }

  let structured;
  try {
    structured = await callClaudeDistill(stage1.text);
  } catch (err) {
    console.error('Stage 2 (distill) failed, falling back to naive parse:', err.message);
    structured = naiveFallbackParse(stage1.text);
  }

  return respond(200, {
    topicId,
    escalation: false,
    generatedAt: new Date().toISOString(),
    headline: structured.headline || null,
    personalizationNote: structured.personalization_note || null,
    doThis: structured.do_this || null,
    why: structured.why || null,
    evidence: Array.isArray(structured.evidence) ? structured.evidence : [],
    watchFor: structured.watch_for || null,
    eat: Array.isArray(structured.eat) ? structured.eat : [],
    avoid: Array.isArray(structured.avoid) ? structured.avoid : [],
    steps: Array.isArray(structured.steps) ? structured.steps : [],
    usedWebSearch: !!stage1.usedWebSearch,
    sources: Array.isArray(stage1.sources) ? stage1.sources : [],
    raw: stage1.text,
  });
}

// Conversational follow-up on an already-generated plan. Deliberately lighter-weight than the
// main plan pipeline: no Stage 2 JSON distillation (a free-form answer doesn't fit the
// Do-this/Why/Watch-for schema), just a short grounded reply, still escalation-checked, still
// eligible for the same web-search grounding.
async function handleFollowup(topic, body) {
  const { topicId, profile, planContext, history, message } = body;
  const context = body.context || {};
  if (!message || !message.trim()) {
    return respond(400, { error: 'Missing follow-up message' });
  }

  const systemPrompt = [
    buildSystemPrompt(topic, context),
    '',
    '## 14. Follow-Up Conversation Mode',
    '',
    "The user already received the plan quoted below and is now asking a follow-up question about it. Answer conversationally in 1-4 sentences, staying inside every rule above (grounding, scope, escalation, plain text, no markdown). Do not restate the full Do this/Why/Watch for template unless the user is explicitly asking for a new plan — just answer the specific question. If the honest answer is 'the library doesn't cover that,' say so.",
  ].join('\n');

  const transcriptLines = [`Original plan given: ${JSON.stringify(planContext || {})}`];
  if (Array.isArray(history)) {
    history.slice(-6).forEach((turn) => {
      transcriptLines.push(`${turn.role === 'user' ? 'User' : 'Coach'}: ${turn.content}`);
    });
  }
  transcriptLines.push(`User: ${message.trim()}`);
  transcriptLines.push('Coach:');

  const userMessage = transcriptLines.join('\n');

  let stage1;
  if (!process.env.OPENAI_API_KEY) {
    stage1 = { text: mockFollowupReply(message), usedWebSearch: false };
  } else {
    try {
      stage1 = await callOpenAI(systemPrompt, userMessage, false, context.allowWebSearch);
    } catch (err) {
      return respond(502, { error: `Follow-up failed: ${err.message}` });
    }
  }

  const cleaned = stripMarkdown(stage1.text).trim();
  if (ESCALATION_MARKERS.some((marker) => cleaned.toLowerCase().includes(marker))) {
    return respond(200, { topicId, mode: 'followup', escalation: true, message: cleaned });
  }

  return respond(200, {
    topicId,
    mode: 'followup',
    escalation: false,
    reply: cleaned,
    usedWebSearch: !!stage1.usedWebSearch,
  });
}

// Cross-topic "Ask Compass" coach — a genuinely different surface from the per-topic plan/
// follow-up flow: it sees the user's adherence across ALL 10 topics at once and can reason
// about prioritization ("what should I focus on this week?") instead of only ever answering
// about whichever single topic's card it was opened from. It does NOT get the full source
// libraries for all 10 topics in context (that would be an enormous, mostly-irrelevant prompt)
// — instead it gets each topic's one-line description/emphasis-summary plus the live adherence
// numbers, and is explicitly told to defer to "open that topic for a fully-grounded plan" when
// a question needs a specific topic's actual research library rather than cross-topic reasoning.
async function handleGlobalChat(body) {
  const { profile, topicsSummary, history, message } = body;
  const context = body.context || {};
  if (!message || !message.trim()) {
    return respond(400, { error: 'Missing message' });
  }

  const summaryLines = (Array.isArray(topicsSummary) ? topicsSummary : [])
    .map((t) => `- ${t.label} (${t.id}): ${Math.round(t.score || 0)}% adherence this week${t.description ? ' — ' + t.description : ''}`)
    .join('\n');

  const systemPrompt = [
    bundle.systemPrompt,
    '',
    '## 9b. Coaching Method (This Deployment)',
    '',
    MI_STYLE_TEXT,
    '',
    '## 10. Cross-Topic Coaching Mode (This Deployment)',
    '',
    "You are answering from a global view across all of this user's tracked topics, not one topic's page. Here is the current state of all their topics:",
    summaryLines,
    '',
    "Use this to reason about prioritization, tradeoffs, and connections between topics (e.g. poor sleep adherence undermining a cognitive-health goal) — that kind of cross-topic reasoning is exactly what this mode is for and the single-topic pages cannot do. You do NOT have the full research library for every topic loaded here. If the user's question needs the specific evidence/mechanism detail from one topic's dedicated library (not just its one-line summary above), say so plainly and suggest they open that specific topic for a fully-grounded plan, rather than inventing specifics you don't actually have loaded. Stay inside every rule from Sections 1-9 above (scope, escalation, evidence honesty). Answer in 2-5 sentences, plain text, no markdown — this is a spoken conversation (the user may be using voice), so write the way you'd actually talk, not the way you'd write a report.",
    context.coachTone && COACH_TONES[context.coachTone] ? COACH_TONES[context.coachTone] : '',
  ].filter(Boolean).join('\n');

  const transcriptLines = [];
  if (Array.isArray(history)) {
    history.slice(-6).forEach((turn) => {
      transcriptLines.push(`${turn.role === 'user' ? 'User' : 'Coach'}: ${turn.content}`);
    });
  }
  transcriptLines.push(`User: ${message.trim()}`);
  transcriptLines.push('Coach:');
  const userMessage = transcriptLines.join('\n');

  let stage1;
  if (!process.env.OPENAI_API_KEY) {
    stage1 = { text: mockFollowupReply(message), usedWebSearch: false, sources: [] };
  } else {
    try {
      stage1 = await callOpenAI(systemPrompt, userMessage, false, context.allowWebSearch);
    } catch (err) {
      return respond(502, { error: `Ask Compass failed: ${err.message}` });
    }
  }

  const cleaned = stripMarkdown(stage1.text).trim();
  if (ESCALATION_MARKERS.some((marker) => cleaned.toLowerCase().includes(marker))) {
    return respond(200, { mode: 'global', escalation: true, message: cleaned });
  }
  return respond(200, { mode: 'global', escalation: false, reply: cleaned, usedWebSearch: !!stage1.usedWebSearch, sources: stage1.sources || [] });
}

// On-demand AI Weekly Synthesis: a short cross-topic narrative connecting what's actually
// happening across all topics (not a per-topic plan), generated only when the user asks for it
// (not on every page load) so it reads as a real analysis moment, not filler content.
async function handleSynthesis(body) {
  const { profile, topicsSummary, journalSummary } = body;
  const context = body.context || {};

  const summaryLines = (Array.isArray(topicsSummary) ? topicsSummary : [])
    .map((t) => `- ${t.label}: ${Math.round(t.score || 0)}% adherence this week`)
    .join('\n');

  const systemPrompt = [
    bundle.systemPrompt,
    '',
    '## 9b. Coaching Method (This Deployment)',
    '',
    MI_STYLE_TEXT,
    '',
    '## 10. Weekly Synthesis Mode (This Deployment)',
    '',
    'Write a short synthesis (150-250 words, plain text, no markdown, no headers, 3 short paragraphs separated by a blank line) of this user\'s week across ALL topics below — not a single-topic plan, and not a report. Write it the way a coach would open a real check-in conversation. Paragraph 1: affirm what is actually working first, citing the actual adherence numbers — MI-style, name the effort before anything else. Paragraph 2: identify ONE real connection between two of their topics (e.g. sleep adherence and cognitive-health goals, or purpose and stress-related topics) — only if the data actually supports a connection; if nothing genuinely connects, say the topics are currently independent rather than inventing a link. Paragraph 3: offer ONE specific topic to focus on next week as an invitation, not an order, referencing the adherence numbers. Stay inside every Section 1-9 rule (scope, escalation, evidence honesty) — this is still wellness coaching, not diagnosis.',
    '',
    'This week\'s adherence across all topics:',
    summaryLines,
    journalSummary ? `\nRecent activity log:\n${journalSummary}` : '',
  ].filter(Boolean).join('\n');

  const userMessage = "Write this week's synthesis.";

  let stage1;
  if (!process.env.OPENAI_API_KEY) {
    stage1 = {
      text: '[MOCK — OPENAI_API_KEY not set] This is a placeholder synthesis. Once your API key is set, this will be a real 150-250 word cross-topic analysis grounded in your actual adherence numbers and activity log, naming what is working, one real connection between two of your topics, and one specific recommendation for next week.',
      usedWebSearch: false,
      sources: [],
    };
  } else {
    try {
      stage1 = await callOpenAI(systemPrompt, userMessage, false, context.allowWebSearch);
    } catch (err) {
      return respond(502, { error: `Synthesis failed: ${err.message}` });
    }
  }

  const cleaned = stripMarkdown(stage1.text).trim();
  if (ESCALATION_MARKERS.some((marker) => cleaned.toLowerCase().includes(marker))) {
    return respond(200, { mode: 'synthesis', escalation: true, message: cleaned });
  }
  return respond(200, {
    mode: 'synthesis',
    escalation: false,
    synthesis: cleaned,
    generatedAt: new Date().toISOString(),
    usedWebSearch: !!stage1.usedWebSearch,
  });
}

// Ambient Daily Briefing: short (2-3 sentence), proactive daily note — distinct from the
// on-demand Weekly Synthesis. This is fetched automatically once per day by the client (not
// button-triggered) so it reads as "the coach already looked and is telling you," the way a
// wearable-data advisor greets you each morning, rather than another action to take.
async function handleBriefing(body) {
  const { topicsSummary } = body;
  const context = body.context || {};

  const summaryLines = (Array.isArray(topicsSummary) ? topicsSummary : [])
    .map((t) => `- ${t.label}: ${Math.round(t.score || 0)}% adherence this week`)
    .join('\n');

  const systemPrompt = [
    bundle.systemPrompt,
    '',
    '## 9b. Coaching Method (This Deployment)',
    '',
    MI_STYLE_TEXT,
    '',
    '## 10. Daily Briefing Mode (This Deployment)',
    '',
    'Write exactly 2 short sentences (plain text, no markdown, no headers) greeting the user with a proactive daily note based on the adherence numbers below — not a full plan, not a full synthesis. Sentence 1: the single most notable real thing about their week so far (a strength or a gap), citing a real number. Sentence 2: one small, specific nudge for today tied to that. Stay inside every Section 1-9 rule (scope, escalation, evidence honesty).',
    '',
    "This week's adherence across all topics:",
    summaryLines,
  ].join('\n');

  const userMessage = "Write today's briefing.";

  let stage1;
  if (!process.env.OPENAI_API_KEY) {
    stage1 = { text: '[MOCK] Your strongest area this week is holding steady, and two topics haven\'t been started yet. A two-minute action on one of those today would round out your week.', usedWebSearch: false };
  } else {
    try {
      stage1 = await callOpenAI(systemPrompt, userMessage, false, context.allowWebSearch);
    } catch (err) {
      return respond(502, { error: `Briefing failed: ${err.message}` });
    }
  }

  const cleaned = stripMarkdown(stage1.text).trim();
  if (ESCALATION_MARKERS.some((marker) => cleaned.toLowerCase().includes(marker))) {
    return respond(200, { mode: 'briefing', escalation: true, message: cleaned });
  }
  return respond(200, { mode: 'briefing', escalation: false, briefing: cleaned, generatedAt: new Date().toISOString() });
}

// Real neural TTS via OpenAI's audio/speech endpoint — the "sound genuine, not monotone" ask.
// Runs server-side (the API key never reaches the browser) and returns base64 audio the client
// plays through a normal <audio> element. Always responds 200 with available:false rather than
// an error status when there's no key or the call fails, so the caller can silently fall back
// to the browser's built-in speechSynthesis instead of treating this as a hard failure.
async function handleSpeech(body) {
  const text = (body.text || '').trim();
  if (!text) return respond(400, { error: 'Missing text' });
  const voice = TTS_VOICES.includes(body.voice) ? body.voice : 'nova';
  const clipped = text.length > 3000 ? text.slice(0, 3000) : text;

  if (!process.env.OPENAI_API_KEY) {
    return respond(200, { mode: 'speech', available: false, reason: 'no_api_key' });
  }

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: OPENAI_TTS_MODEL, voice, input: clipped, response_format: 'mp3' }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const audio = Buffer.from(arrayBuffer).toString('base64');
    return respond(200, { mode: 'speech', available: true, audio, format: 'mp3', voice });
  } catch (err) {
    console.error('TTS failed, client will fall back to browser speech synthesis:', err.message);
    return respond(200, { mode: 'speech', available: false, reason: err.message });
  }
}

// Meal photo analysis (Thrive-inspired): a vision-capable Stage 1 look at an uploaded photo,
// then the same forced-tool-use Stage 2 pattern used everywhere else in this app to turn that
// into a reliable structured card — estimated foods/calories/macros plus one suggestion tied to
// a real mechanism, never generic advice. Estimates are photo-based and explicitly labeled
// low/moderate confidence, never presented as a food-scale-accurate measurement.
async function handleMealPhoto(body) {
  const { imageBase64, profile } = body;
  const context = body.context || {};
  if (!imageBase64 || !imageBase64.startsWith('data:image/')) {
    return respond(400, { error: 'Missing or invalid image' });
  }

  let stage1Text;
  let usedVision = false;
  if (!process.env.OPENAI_API_KEY) {
    stage1Text = mockMealStage1();
  } else {
    try {
      stage1Text = await callOpenAIVision(process.env.OPENAI_API_KEY, imageBase64, buildMealPrompt(profile || {}));
      usedVision = true;
    } catch (err) {
      return respond(502, { error: `Meal photo analysis failed: ${err.message}` });
    }
  }

  let structured;
  try {
    structured = await callClaudeDistillMeal(stage1Text);
  } catch (err) {
    console.error('Meal Stage 2 (distill) failed, falling back to raw text:', err.message);
    structured = {
      foods: [], total_calories_estimate: null, protein_g: null, carbs_g: null, fat_g: null,
      suggestion: stripMarkdown(stage1Text).slice(0, 240), confidence: 'low',
    };
  }

  return respond(200, {
    mode: 'mealPhoto',
    generatedAt: new Date().toISOString(),
    usedVision,
    foods: Array.isArray(structured.foods) ? structured.foods : [],
    totalCaloriesEstimate: structured.total_calories_estimate ?? null,
    proteinG: structured.protein_g ?? null,
    carbsG: structured.carbs_g ?? null,
    fatG: structured.fat_g ?? null,
    suggestion: structured.suggestion || null,
    confidence: structured.confidence === 'moderate' ? 'moderate' : 'low',
  });
}

// Conversational onboarding turn. Runs entirely on Claude (no web search needed — this is a
// short getting-to-know-you conversation, not a grounded research answer) via the same
// forced-tool-use pattern used everywhere else, so the model can never return anything malformed
// for the UI to trip on. The user can end this at any point ("stop", "skip", "use the form") and
// the model is explicitly told to respect that immediately rather than pushing back.
async function handleIntake(body) {
  const { history, message } = body;

  const transcriptLines = [];
  if (Array.isArray(history)) {
    history.slice(-16).forEach((turn) => {
      transcriptLines.push(`${turn.role === 'user' ? 'User' : 'Coach'}: ${turn.content}`);
    });
  }
  if (message && message.trim()) transcriptLines.push(`User: ${message.trim()}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    return respond(200, mockIntakeTurn(transcriptLines.filter((l) => l.startsWith('User:')).length));
  }

  const instruction = [
    MI_STYLE_TEXT,
    '',
    "This is a brand-new user's very first conversation with you, before any profile exists. Have a short, warm, natural conversation — at most 4 of your own questions total, fewer if they cover several things in one message — to learn their main goal, general lifestyle (diet pattern, activity level, rough sleep, stress), and what's actually going on in their life right now. Ask ONE question at a time, conversationally, the way a good coach's first session actually sounds — never read out a form. If the user says anything like \"stop\", \"skip\", \"I\\'d rather use the form\", or similar, set done=true immediately, thank them briefly, and stop — never push back on that. Once you have a real goal plus at least two lifestyle facts, or you have asked 4 questions, set done=true with a brief warm close. Call the intake_turn tool for every turn — never reply in plain text.",
    '',
    transcriptLines.length ? `Conversation so far:\n${transcriptLines.join('\n')}` : '(This is the very first turn — nothing said yet. Open with a warm, compass-themed greeting and your first question.)',
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      temperature: 0.6,
      tools: [INTAKE_TOOL],
      tool_choice: { type: 'tool', name: 'intake_turn' },
      messages: [{ role: 'user', content: instruction }],
    }),
  });
  if (!res.ok) {
    return respond(502, { error: `Intake failed: Anthropic ${res.status}: ${await res.text()}` });
  }
  const data = await res.json();
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use' && b.name === 'intake_turn');
  if (!toolUse || !toolUse.input) {
    return respond(502, { error: 'Intake failed: no intake_turn tool_use block' });
  }
  const input = toolUse.input;
  const cleanedMessage = stripMarkdown(input.message || '').trim();
  if (ESCALATION_MARKERS.some((marker) => cleanedMessage.toLowerCase().includes(marker))) {
    return respond(200, { mode: 'intake', escalation: true, message: cleanedMessage });
  }
  const ex = input.extracted || {};
  return respond(200, {
    mode: 'intake',
    escalation: false,
    done: !!input.done,
    message: cleanedMessage,
    extracted: {
      primaryGoal: stripMarkdown(ex.primaryGoal || ''),
      dietPattern: stripMarkdown(ex.dietPattern || ''),
      activityLevel: stripMarkdown(ex.activityLevel || ''),
      sleepHours: stripMarkdown(ex.sleepHours || ''),
      stressLevel: stripMarkdown(ex.stressLevel || ''),
      mainStressor: stripMarkdown(ex.mainStressor || ''),
      selfDescription: stripMarkdown(ex.selfDescription || ''),
    },
  });
}

const MOCK_INTAKE_STEPS = [
  "[MOCK — ANTHROPIC_API_KEY not set] Hi — I'm your coach. Before we dive into any topic, tell me a bit about yourself: what's the main thing you're hoping to get out of this, in your own words?",
  "[MOCK] Got it, thanks for sharing that. What does a typical day look like for you right now — are you fairly active, or mostly sitting?",
  "[MOCK] That's helpful. And how's your sleep been lately — roughly how many hours, and does it feel like enough?",
  "[MOCK] One last one: what's the biggest source of stress in your life right now, if anything?",
];
function mockIntakeTurn(turnCount) {
  if (turnCount >= MOCK_INTAKE_STEPS.length) {
    return {
      mode: 'intake', escalation: false, done: true,
      message: "[MOCK] Thanks for sharing all that — once your API key is set, I'll use this to personalize everything from here. Let's get started.",
      extracted: {
        primaryGoal: '[MOCK] More energy', dietPattern: '[MOCK] Standard / omnivore', activityLevel: 'light',
        sleepHours: '6.5', stressLevel: 'moderate', mainStressor: '[MOCK] Work',
        selfDescription: '[MOCK] This is a placeholder summary — once ANTHROPIC_API_KEY is set, this becomes a real 1-3 sentence reflection of what you actually told the coach.',
      },
    };
  }
  return { mode: 'intake', escalation: false, done: false, message: MOCK_INTAKE_STEPS[turnCount], extracted: { primaryGoal: '', dietPattern: '', activityLevel: '', sleepHours: '', stressLevel: '', mainStressor: '', selfDescription: '' } };
}

function buildMealPrompt(profile) {
  return [
    "Look at this meal photo. Identify each distinct food you can actually see — do not guess at things you can't see (e.g. don't assume a sauce is present if you can't see it).",
    'For each food, estimate a typical serving weight in grams and calories, based on common portion sizes and standard nutrition data. State plainly that these are visual estimates, not a food-scale measurement.',
    'Estimate total calories and protein/carbs/fat in grams for the whole plate.',
    'Give exactly one specific suggestion tied to a real nutritional mechanism relevant to what is actually on the plate (e.g. fiber and gut microbiome/SCFA production, protein and satiety signaling, refined-carbohydrate and blood-sugar response) — never a generic "eat healthier."',
    profile.dietPattern ? `The user follows a ${profile.dietPattern} diet pattern — keep the suggestion compatible with that.` : '',
    'Plain text only, no markdown.',
  ].filter(Boolean).join(' ');
}

function buildSystemPrompt(topic, context) {
  context = context || {};
  const sourceText = topic.sources.map((id) => bundle.sources[id]).join('\n\n---\n\n');

  const formattingRules = [
    'Plain text only. Do not use markdown syntax of any kind — no **bold**, no *italics*, no # headers, no bullet dashes. Write "Reflect:", "Do this:", "Why:", and "Watch for:" as plain labels on their own line, exactly that spelling, followed by the content on the same line.',
    `Before "Do this:", write a "Reflect:" line — one sentence, MI-style, reflecting the user's specific situation back to them using an actual value from their profile if one is available (their stated goal, an adherence number, a specific number like sleep hours) — never a generic opener. If the profile is genuinely empty, write "Reflect: none" instead of inventing something to reflect.`,
    'Whenever a source gives a specific number for the action you are recommending — grams, a percentage, a frequency, a timeframe — state that exact number. Never write "more," "some," or "a bit" when a source has already told you how much. If no source gives a number for this specific action, say so plainly rather than inventing one.',
    'If — and only if — the action you chose is naturally a short timed sequence rather than one instruction (a breathing pattern, a stretch routine, a walk with a warm-up/brisk/cool-down structure), add one more line: "Steps: Label one (seconds) ; Label two (seconds) ; ..." — e.g. "Steps: Inhale slowly through your nose (4) ; Hold (7) ; Exhale slowly through your mouth (8)". Most actions (eat this, message someone, journal one line) are NOT sequential — do not invent steps for a single-instruction action just to use this feature. Never more than 6 steps.',
  ];

  if (topic.foodRelevant) {
    formattingRules.push(
      'This topic involves specific foods. After Watch for (or after Why, if there is no Watch for), add exactly two more lines, each a single line (no line breaks within it):',
      'Eat: 3-5 items separated by " ; ", each item formatted as "Food name (quantity or frequency if stated): one-line reason" — e.g. "Eat: Lentils (about 1/2 cup): ferments into propionate, which supports satiety signaling ; Oats (about 1/2 cup dry): a strong resistant-starch source for SCFA-producing bacteria." If a source gives no quantity for an item, drop the parenthetical rather than inventing one; never drop the reason.',
      'Avoid: 2-4 items in the exact same format, but only foods a source specifically names as something to limit (e.g. refined carbohydrates, excess sodium, ultra-processed food). If nothing is called out to avoid for this specific topic, write exactly "Avoid: none specified" — do not invent a caution.'
    );
  }

  const sections = [
    bundle.systemPrompt,
    '',
    '## 9b. Coaching Method (This Deployment)',
    '',
    MI_STYLE_TEXT,
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
  ];

  if (WEB_SEARCH_ENABLED && context.allowWebSearch !== false) {
    sections.push(
      '',
      '## 12. Extended Grounding (This Deployment)',
      '',
      `You have live web search available this turn, and you are explicitly encouraged to use it — this deployment's user has given standing permission to branch beyond the static library whenever it makes the answer more specific or current. Use it to find additional, specific support from ${TRUSTED_DOMAINS_TEXT}. Never cite blogs, commercial wellness sites, forums, or unsourced health content, even if search surfaces them.`,
      `When you use a web-found source, say so plainly (e.g. "A 2023 NIH-funded study found...") and give the specific finding with its number/timeframe, exactly as you would for a library source — never blend a web claim into a library claim as if they were the same source. The static library below is still the anchor for this topic's core mechanism, but you should actively reach for web search whenever: the library is thin for this topic (flagged in the Emphasis line above when true), the user's profile includes something the static library does not cover at all (a genetic variant, a specific number like resting heart rate or blood pressure), the user's question needs more specific/current support than the library has, or to add genuine variety across repeated requests. Do not treat web search as a last resort — treat the static library as the floor, not the ceiling, of what you can ground a claim in.`,
      `Cross-reference before stating a specific numeric or causal claim from the web: prefer a finding that shows up consistently across at least two independent credible sources over a single one-off result, and if two credible sources meaningfully disagree on a number, say so rather than picking one silently (e.g. "estimates range from X to Y across sources" rather than presenting one as certain). This matters most on thin topics — see the Emphasis line above for whether this topic depends on web search more heavily.`,
      `Search suggestion for this topic specifically: ${topic.webSearchHint || 'peer-reviewed research from PubMed, NIH, or a major academic medical center'}.`
    );
  }

  if (context.coachTone && COACH_TONES[context.coachTone]) {
    sections.push('', '## 13. Coaching Tone (User Preference, This Deployment)', '', COACH_TONES[context.coachTone]);
  }

  sections.push('', sourceText);
  return sections.join('\n');
}

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

function buildUserMessage(topic, profile, context) {
  const lines = Object.entries(profile)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `- ${labelize(k)}: ${Array.isArray(v) ? v.join(', ') : v}`);

  const parts = [
    "Here is the user's current profile:",
    lines.length ? lines.join('\n') : '(no profile data provided)',
  ];

  if (typeof context.adherencePct === 'number') {
    parts.push(
      '',
      `Current adherence on this topic this week: ${Math.round(context.adherencePct)}%. If this is low (under ~40%), make today's action smaller/easier than usual — reduce friction further rather than adding ambition. If this is high (over ~80%), it is safe to gently expand or add a small second layer, per the Fogg-model rule in Section 6 of your instructions ("expand only after the user confirms the current step is working").`
    );
  }

  if (Array.isArray(context.recentActions) && context.recentActions.length) {
    parts.push(
      '',
      `Actions already suggested for this topic recently (do not repeat the same action or mechanism — pick a genuinely different one per your Emphasis instructions): ${context.recentActions.map((a) => `"${a}"`).join('; ')}`
    );
  }

  if (context.timeBudget) {
    const budgetInstructions = {
      '2min': 'The user says they realistically have about 2 minutes today. The action must be completable in 2 minutes or less, no prep, no equipment, no leaving the room. Scale ambition down hard rather than picking an action that technically fits in 2 minutes but assumes momentum.',
      '10min': 'The user says they realistically have about 10 minutes today. Size the action to fill that window meaningfully without overshooting into something that needs 30+ minutes.',
      '30min': 'The user says they have a real 30-minute window today. It is safe to suggest something with more depth or a short sequence of steps than your smallest default action, since they have room for it.',
    };
    if (budgetInstructions[context.timeBudget]) {
      parts.push('', budgetInstructions[context.timeBudget]);
    }
  }

  parts.push('', `Build today's action plan for ${topic.label}.`);
  return parts.join('\n');
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

// Returns { text, usedWebSearch, sources }. Tries the web-search-enabled Responses API path
// first (if enabled and not overridden off for this request); on ANY failure (unsupported
// model, API shape drift, rate limit), falls back to the plain Chat Completions call that has
// been proven to work, rather than erroring the request.
async function callOpenAI(systemPrompt, userMessage, foodRelevant, allowWebSearch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { text: mockStage1(userMessage, foodRelevant), usedWebSearch: false, sources: [] };
  }

  if (WEB_SEARCH_ENABLED && allowWebSearch !== false) {
    try {
      const { text, sources } = await callOpenAIResponsesWithSearch(apiKey, systemPrompt, userMessage);
      if (text && text.trim()) return { text: text.trim(), usedWebSearch: true, sources };
    } catch (err) {
      console.error('Web-search-enabled OpenAI call failed, falling back to standard call:', err.message);
    }
  }

  const text = await callOpenAIChatCompletions(apiKey, systemPrompt, userMessage);
  return { text, usedWebSearch: false, sources: [] };
}

async function callOpenAIResponsesWithSearch(apiKey, systemPrompt, userMessage) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_WEB_SEARCH_MODEL,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      tools: [{ type: 'web_search_preview' }],
      max_output_tokens: 700,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI Responses ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const sources = extractCitations(data);
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return { text: data.output_text, sources };
  }
  const messageItem = (data.output || []).find((item) => item.type === 'message');
  const textBlock = messageItem?.content?.find((c) => c.type === 'output_text' || c.type === 'text');
  if (textBlock?.text) return { text: textBlock.text, sources };
  throw new Error('No output text found in OpenAI Responses payload');
}

// Defensive, best-effort: the Responses API's web_search_preview tool is documented to attach
// url_citation annotations to output text blocks, but this has never been verified here against
// a live successful call (no live key/network in this environment) — if the shape is anything
// other than expected, this simply returns an empty array rather than throwing, so a wrong
// assumption never breaks the actual response.
function extractCitations(data) {
  try {
    const messageItem = (data.output || []).find((item) => item.type === 'message');
    const blocks = messageItem?.content || [];
    const seen = new Set();
    const out = [];
    for (const block of blocks) {
      for (const ann of block.annotations || []) {
        if (ann.type !== 'url_citation' || !ann.url) continue;
        if (seen.has(ann.url)) continue;
        seen.add(ann.url);
        let domain = ann.url;
        try { domain = new URL(ann.url).hostname.replace(/^www\./, ''); } catch {}
        out.push({ title: ann.title || domain, domain, url: ann.url });
      }
    }
    return out.slice(0, 5);
  } catch {
    return [];
  }
}

async function callOpenAIChatCompletions(apiKey, systemPrompt, userMessage) {
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

// Vision-capable call for meal photo analysis — separate from callOpenAI's text-only path
// since it needs an image content part and a dedicated (usually pricier/more accurate) model.
async function callOpenAIVision(apiKey, imageDataUrl, promptText) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI Vision ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('No text in OpenAI Vision response');
  return text;
}

async function callClaudeDistillMeal(stage1Text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return mockMealDistill(stage1Text);

  const instruction = [
    'Restructure the meal analysis below by calling the format_meal tool. Do not invent foods not mentioned in the text.',
    '',
    'Meal analysis to restructure:',
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
      max_tokens: 700,
      temperature: 0,
      tools: [MEAL_FORMAT_TOOL],
      tool_choice: { type: 'tool', name: 'format_meal' },
      messages: [{ role: 'user', content: instruction }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const toolUse = (data.content || []).find((b) => b.type === 'tool_use' && b.name === 'format_meal');
  if (!toolUse || !toolUse.input) {
    throw new Error('Anthropic response had no format_meal tool_use block');
  }
  const input = toolUse.input;
  return {
    foods: Array.isArray(input.foods)
      ? input.foods.map((f) => ({ name: stripMarkdown(f.name || ''), estimatedGrams: f.estimated_grams ?? null, estimatedCalories: f.estimated_calories ?? null })).filter((f) => f.name)
      : [],
    total_calories_estimate: input.total_calories_estimate ?? null,
    protein_g: input.protein_g ?? null,
    carbs_g: input.carbs_g ?? null,
    fat_g: input.fat_g ?? null,
    suggestion: stripMarkdown(input.suggestion || ''),
    confidence: input.confidence === 'moderate' ? 'moderate' : 'low',
  };
}

function mockMealStage1() {
  return '[MOCK — OPENAI_API_KEY not set] This is placeholder meal analysis text. Once your API key is set, this will describe the actual foods visible in your photo with estimated grams and calories per item, based on standard portion-size data — not a food-scale measurement.';
}

function mockMealDistill() {
  return {
    foods: [
      { name: '[MOCK] Grilled chicken breast', estimatedGrams: 140, estimatedCalories: 230 },
      { name: '[MOCK] Steamed broccoli', estimatedGrams: 100, estimatedCalories: 35 },
      { name: '[MOCK] White rice', estimatedGrams: 150, estimatedCalories: 195 },
    ],
    total_calories_estimate: 460,
    protein_g: 38,
    carbs_g: 45,
    fat_g: 6,
    suggestion: '[MOCK — set OPENAI_API_KEY for a real analysis] Swapping the white rice for a fiber-rich whole grain would add substrate for SCFA-producing gut bacteria without changing the rest of the plate.',
    confidence: 'low',
  };
}

async function callClaudeDistill(stage1Text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return mockDistill(stage1Text);
  }

  const instruction = [
    'Restructure the coach response below by calling the format_plan tool.',
    'Do NOT add, remove, soften, or invent any fact — restructure, split, and strip markdown formatting only.',
    'If the response has a "Reflect:" line, that IS personalization_note verbatim (stripped of the label) — unless it says "Reflect: none", in which case personalization_note is null. Never write your own reflection; only extract theirs.',
    'If the response has an "Eat:" and/or "Avoid:" line (semicolon-separated items like "Food (quantity): reason"), split each on " ; " then split each item on the first ":" into food vs. detail. If a line is absent, or Avoid says "none specified", return an empty array for it.',
    'If the response has a "Steps:" line (semicolon-separated items like "Label (seconds)"), split each on " ; " then parse the parenthetical number as seconds. If absent, return an empty array — do not invent a step sequence for a non-sequential action.',
    'For each evidence item, infer a "strength" tier from the language used (see schema) and extract any quoted phrase as "source_quote" (null if none).',
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
      max_tokens: 900,
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
    personalization_note: input.personalization_note ? stripMarkdown(input.personalization_note) : null,
    do_this: stripMarkdown(input.do_this || ''),
    why: stripMarkdown(input.why || ''),
    evidence: Array.isArray(input.evidence)
      ? input.evidence.map((e) => ({
        text: stripMarkdown(e.text || ''),
        type: e.type === 'limitation' ? 'limitation' : 'figure',
        strength: ['strong', 'moderate', 'preliminary'].includes(e.strength) ? e.strength : 'moderate',
        sourceQuote: e.source_quote ? stripMarkdown(e.source_quote) : null,
      }))
      : [],
    watch_for: input.watch_for ? stripMarkdown(input.watch_for) : null,
    eat: cleanItems(input.eat),
    avoid: cleanItems(input.avoid),
    steps: Array.isArray(input.steps)
      ? input.steps.map((s) => ({ label: stripMarkdown(s.label || ''), seconds: Number(s.seconds) || 0 })).filter((s) => s.label && s.seconds > 0).slice(0, 6)
      : [],
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
  const reflect = pick('Reflect', ['Do this', 'Why', 'Watch for', 'Eat', 'Avoid', 'Steps']);
  const doThis = pick('Do this', ['Why', 'Watch for', 'Eat', 'Avoid', 'Steps']);
  const why = pick('Why', ['Watch for', 'Eat', 'Avoid', 'Steps']);
  const watchFor = pick('Watch for', ['Eat', 'Avoid', 'Steps']);
  const eatLine = pick('Eat', ['Avoid', 'Steps']);
  const avoidLine = pick('Avoid', ['Steps']);
  const stepsLine = pick('Steps', []);
  const personalizationNote = reflect && !/^none$/i.test(reflect.trim()) ? reflect : null;
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
  // Expected shape: "Label one (seconds) ; Label two (seconds) ; ..."
  const parseSteps = (line) => {
    if (!line) return [];
    return line.split(/\s*;\s*/).map((item) => item.trim()).filter(Boolean).map((item) => {
      const m = item.match(/^(.*)\((\d+)\)\s*$/);
      return m ? { label: m[1].trim(), seconds: Number(m[2]) } : null;
    }).filter(Boolean).slice(0, 6);
  };

  if (doThis || why) {
    return { headline: null, personalization_note: personalizationNote, do_this: doThis, why, evidence: [], watch_for: watchFor, eat: parseFoodItems(eatLine), avoid: parseFoodItems(avoidLine), steps: parseSteps(stepsLine) };
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
    steps: [],
  };
}

function mockFollowupReply(message) {
  return `[MOCK — OPENAI_API_KEY not set] That's a fair question about "${message.trim().slice(0, 70)}" — I just don't have a live model wired up to actually answer it yet. Once OPENAI_API_KEY is set, I'll give you a real, specific answer grounded in your research library, the same way I would in a live coaching conversation.`;
}

function mockStage1(userMessage, foodRelevant) {
  const lines = [
    '[MOCK — OPENAI_API_KEY not set]',
    "Reflect: You're building consistency here, and that's the part that actually compounds — one more real fiber source today keeps that going.",
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
    personalization_note: "[MOCK] You're building consistency here, and that's the part that actually compounds — one more real fiber source today keeps that going.",
    do_this: '[MOCK — ANTHROPIC_API_KEY not set] After your next meal, add one 1/2-cup serving of a fiber-rich food you did not eat earlier today — beans, lentils, oats, or a whole grain.',
    why: 'This is a mock distillation. Set ANTHROPIC_API_KEY to get a real Stage 2 response. The uploaded source library associates a roughly 25g/day increase in fiber intake with measurable microbiome changes within two weeks.',
    evidence: [{ text: stage1Text.slice(0, 160), type: 'limitation', strength: 'moderate', sourceQuote: null }],
    watch_for: null,
    eat: foodRelevant ? [
      { food: 'Lentils', detail: 'about 1/2 cup — ferments into propionate, which supports satiety and metabolic signaling.' },
      { food: 'Oats', detail: 'about 1/2 cup dry — a strong resistant-starch source for SCFA-producing bacteria.' },
      { food: 'Cooled potatoes or rice', detail: 'a few times per week — resistant starch forms on cooling, feeding beneficial microbes.' },
    ] : [],
    avoid: foodRelevant ? [
      { food: 'Ultra-processed low-fiber snacks', detail: 'displacing fiber sources reduces substrate for SCFA production.' },
    ] : [],
    steps: [
      { label: '[MOCK] Inhale slowly through your nose', seconds: 4 },
      { label: 'Hold', seconds: 7 },
      { label: 'Exhale slowly through your mouth', seconds: 8 },
    ],
  };
}
