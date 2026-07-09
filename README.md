# Longevity Compass

An MVP AI longevity wellness coach: a Netlify site with a two-stage LLM pipeline
(ChatGPT grounds the answer in a curated research library, Claude restructures it
into clean JSON for the UI) and a dashboard that visualizes adherence across 10
longevity topics as a radar chart instead of a generic XP bar.

## How it works

```
User profile + topic  --->  Stage 1: OpenAI (ChatGPT)  --->  Stage 2: Anthropic (Claude)  --->  UI
                             reads the system prompt          restructures Stage 1's
                             + that topic's source library     plain-text answer into
                             -> plain-text "Do this / Why /     strict JSON, without
                             Watch for" answer, grounded        adding/removing any
                             only in the provided sources       fact — presentation only
```

- **Stage 1 (grounding)** — `netlify/functions/coach.js` sends the system prompt
  (`data/system-prompt.md`) plus the relevant topic's research library
  (`data/sources/*.md`) to OpenAI's Chat Completions API. This is the only stage
  that is allowed to introduce facts, and only from the supplied library.
- **Stage 2 (distillation)** — the raw Stage 1 text is sent to Anthropic's Messages
  API using **forced tool-use** (not "please reply with JSON as text" — a schema
  is passed and Claude is required to call it, so the API itself guarantees a
  valid structured object; there is no JSON string to parse or fail on). It
  reshapes Stage 1's text into `{headline, do_this, why, evidence[], watch_for}`
  and strips any markdown formatting Stage 1 left in, without adding or changing
  any factual content. This is presentation-layer work, not research work.
- **Never a blank card.** If Stage 2 is unavailable, a fallback parser extracts
  the same fields from Stage 1's raw text directly; if even that structure isn't
  present, the full cleaned text is shown rather than nothing. An earlier version
  of this fallback parser had a regex bug (a duplicated colon that made its
  "stop here" pattern impossible to match) that could silently produce a blank
  plan — fixed and covered by a unit test in the commit that fixed it.
- **Escalation safety** runs twice: once as a deterministic local check
  (`checkLocalRedFlags` in `coach.js`, before either API call) and once inside the
  system prompt itself (Section 5). Either one tripping short-circuits straight to
  an escalation message — Stage 2 never touches it.
- **API keys never reach the browser.** Both calls happen inside the Netlify
  Function, server-side. The frontend only ever calls `/api/coach`.

## Why not import a ChatGPT custom GPT / saved thread directly?

You asked if you could upload "a certain ChatGPT chat trained on what's optimal."
There's no API for pointing at a specific ChatGPT web-UI conversation or Custom
GPT — those aren't addressable via the API. Two real options if you want that:

1. **What's built here (recommended for this size of library):** the system
   prompt + source docs are injected directly into the API call's context every
   time. It's what the original prompt-engineering chat was already doing, it's
   fully inspectable/versioned in this repo, and your source library (a few docs,
   a few thousand words each) is well within a single context window — no
   retrieval infrastructure needed.
2. **OpenAI Assistants/Responses API with a vector store**, if the source library
   grows large enough that stuffing it all into context every call gets
   expensive or starts diluting relevance. You'd upload the source docs to a
   vector store once and reference it by ID; retrieval happens per-query instead
   of full-injection. Worth revisiting if you add many more topics/sources, not
   needed today.

## What you need to do

1. **Get API keys**: an OpenAI API key and an Anthropic API key.
2. **Local testing**: copy `.env.example` to `.env` and fill in the keys, then
   `npm install` and `npm run dev` (uses `netlify-cli`, which proxies
   `/api/*` to the local function). Without keys set, every request returns a
   clearly-labeled mock response — the whole app is testable with zero cost.
3. **Deploy**: connect this repo to a new Netlify site, then in
   **Site configuration → Environment variables** add `OPENAI_API_KEY` and
   `ANTHROPIC_API_KEY`. Do not put them anywhere else (not in `netlify.toml`, not
   in a client-side file) — Netlify injects them into the function's runtime only.
4. **If you edit any research doc** (`data/sources/*.md`, `data/topics.json`, or
   `data/system-prompt.md`), run `npm run build:sources` and commit the
   regenerated `netlify/functions/lib/sources-bundle.json` and
   `public/data/topics.json` — the function reads from that bundle, not the raw
   files, so it has to be rebuilt after edits.

## The experience layer (motivation, without fake pressure)

- **Lifetime XP & levels** (`public/js/effects.js`): every day marked done awards
  +10 XP toward a level that only ever goes up — shown as a badge + progress bar
  at the top of the sidebar. This is deliberately separate from the adherence
  percentages (radar, sidebar rings, topic pages), which stay honest and can go
  down if you uncheck a day. The split matters: adherence tells you the truth
  about this week, XP rewards effort you've already put in and can never be taken
  away — the intentional replacement for streaks, which reward "not missing a
  day" and end up pressuring people to fake compliance rather than recover from
  a missed one.
- **Confetti + toasts**: marking a day done bursts a small confetti animation at
  the button; completing a topic's full week or leveling up triggers a bigger
  burst and a toast notification.
- **Topic identity colors**: each of the 10 topics has its own accent color
  (from the same validated, colorblind-safe categorical palette used for the
  sidebar icons, plan-card headers, and topic badges) — used for *identity*
  contexts. The radar chart deliberately keeps a single hue, because it's one
  series' magnitude across categories, not 10 different series — mixing the two
  color jobs is a common charting mistake.
- **Radar v2**: renders ~40% larger, morphs smoothly between old and new values
  on every change (rather than snapping), has a soft glow on the data line, and
  a rich hover tooltip (icon, name, exact %, "click to open") instead of a bare
  browser tooltip.

## Food guide (Eat / Limit) and specificity

For the seven topics where food choices are the actual lever (`foodRelevant:
true` in `data/topics.json` — Nutrition, Gut Microbiome, Metabolic & CV,
Micronutrient, Cognitive, Energy & Mitochondrial, Weight), the pipeline asks
for two extra lines beyond the core Do this/Why/Watch for: an `Eat:` line and
an `Avoid:` line, each a semicolon-separated list of "Food (quantity if the
source gives one): one-line reason." Stage 2 splits these into a real `eat[]`
/ `avoid[]` array, rendered as a two-column card distinct from the rest of the
plan. Topics where food isn't the mechanism (Purpose, Sleep, Activity) simply
get empty arrays and show nothing extra — this isn't a UI toggle, it's driven
by whether the topic's own source library is actually about food.

The system prompt also now explicitly forbids vague quantities: if the source
gives a number (25g/day, 1/2 cup, twice a week), the response must use it —
"add more fiber" is treated as a **specificity failure**, the same way the
original prompt-grading rubric penalized it. This was already a rule in
Section 3 of your system prompt; Section 11 (added here, per-request) makes it
concrete and unavoidable rather than aspirational.

Topic pages also now show a one-line editorial description (`description` in
`topics.json`) above the plan area regardless of whether a plan has been
generated yet, so a freshly opened topic reads as a finished page, not an
empty box waiting for content.

## Personalization & settings

- **Onboarding**: on a browser's first visit, a modal collects the profile fields
  and (optionally) a genetic-markers checklist before showing the dashboard.
  "Skip for now" is always available — it won't ask again either way.
- **Genetic markers**: the checklist only lists variants that actually appear in
  `data/sources/micronutrient.md` (MTHFR, VDR, APOE4, HFE, TRPM6, FADS1/ELOVL2,
  PEMT, BCMO1, GPX1, zinc transporter). Reported markers are wired into the
  **Micronutrient & Vitamin Status** and **Cognitive Health** topics' prompts
  specifically (the two topics whose source library actually covers genetics) —
  other topics receive the data but have no genetic source to ground it in, so
  they correctly ignore it rather than fabricate a connection.
- **Settings tab**: theme (System/Light/Dark, persisted, no flash on reload),
  units (metric/imperial — profile is always stored internally in kg/cm, only
  the displayed number and label convert), "always show full plan detail"
  (overrides the default collapse-after-first-view behavior), a JSON
  export/import of everything stored locally, and "reset all local data."
- **Plan card headline**: Stage 2 (Claude) now also produces a short, punchy
  headline that's a compression of `do_this` — never a new claim — so each
  topic's card leads with something memorable instead of a plain label/value row.
- **No free-text profile fields**: diet pattern and primary goal are selects
  (with an "Other" option that reveals a small text box) rather than open text,
  so a plan request never hinges on the model parsing an arbitrary sentence.
- **"Mark done" is wired straight into the tracker**: the button inside the
  deliverable box marks the next incomplete day directly — no need to scroll
  down to the dot row separately, though it's still there for correcting a
  specific day.

## Verifying the live two-stage pipeline

Once `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are set on Netlify and deployed,
open any topic and click "Get today's plan." A **real** response has no
"[MOCK...]" text anywhere in the card and the yellow "Mock response" banner is
gone. If you get an error instead of a plan, it's almost always one of:
key not actually saved before the last deploy (env vars only apply to the
*next* build — redeploy after adding them), a typo in the key, or a billing/quota
issue on the OpenAI or Anthropic account. The error message shown in the UI
includes the HTTP status from whichever API failed, which narrows it down fast.

## Extended grounding: live web search (added this round)

Stage 1 can now also use OpenAI's hosted `web_search_preview` tool, controlled by:

- `ENABLE_WEB_SEARCH` (default `true` — set to `"false"` to disable)
- `OPENAI_WEB_SEARCH_MODEL` (default `gpt-4o` — the model that carries the search tool; the plain-text model in `OPENAI_MODEL` is unchanged and still used for the no-search fallback path)

The static source library is still the primary, default source. Web search is
scoped by **prompt instruction, not an API-level domain filter**, to a named
allowlist (NIH/PubMed, CDC, WHO, FDA, .edu/major hospitals, Nature/NEJM/JAMA/
Lancet/BMJ/Cell) and is meant to fill genuine gaps — the two topics with thin
static libraries (Sleep, Activity) explicitly invite it — or add variety across
repeated requests, not fire on every single turn. Every web-sourced claim must
be labeled as such in the response, distinct from library claims. The response
card shows a "web search" badge when it actually fired, and a `usedWebSearch`
field is returned from the API either way.

**Honesty note on this piece specifically**: I could not test a real successful
`web_search_preview` call end-to-end — this sandbox has no live API key and no
network path to `api.openai.com`. The integration is defensively coded so a
wrong assumption about the response shape degrades gracefully: any failure in
that code path (wrong model, API drift, rate limit, unexpected JSON shape)
silently falls back to the plain Chat Completions call that's been proven to
work, rather than breaking the request. Do one real smoke test with your keys
before relying on it, and check server logs if `usedWebSearch` never comes back
`true`.

## A more versatile, less narrow-path prompt (added this round)

You asked for a coach that doesn't just default to "add fiber" or "take a walk"
for everyone. I extended the prompt through **Section 10 and beyond** —
`data/system-prompt.md` (your Sections 1-9, the actual system-prompt deliverable
for your internship) is untouched. Everything below is appended per-request by
`coach.js`'s `buildSystemPrompt()`:

- **Section 10** — the topic's source library + a richer, more specific
  `emphasis` line per topic (`data/topics.json`) that explicitly instructs
  mechanism *rotation* (don't reuse the same action/citation across requests)
  and fixes a real quality bug this project caught earlier, where the Cognitive
  topic was silently reusing the Purpose topic's citation almost verbatim.
- **Section 11** — output formatting (plain text, exact numbers when a source
  has one, the Eat/Avoid format for food-relevant topics).
- **Section 12** — the web search rules described above (only appended if
  `ENABLE_WEB_SEARCH` is on).
- **Section 14** — a lighter "Follow-Up Conversation Mode" prompt used only by
  the new chat feature (below), so a follow-up answer reads as a short,
  conversational reply instead of the full Do this/Why/Watch for template.

Two more request-time levers make each plan less generic without touching the
prompt file at all:

- **Adherence-aware pacing** — every plan request now sends this week's
  adherence % for that topic. Below ~40%, the model is told to shrink the
  action further; above ~80%, it's told it's safe to expand (citing the
  Fogg-model rule already in your Section 6).
- **Anti-repetition memory** — the last few `do_this` actions generated for a
  topic are sent back with the next request and the model is told not to repeat
  the same action or mechanism, so regenerating a plan doesn't just reshuffle
  the same suggestion.

## Evidence strength & "show your work"

Each evidence bullet on a plan card now carries a strength badge — **Strong**
(meta-analyses/systematic reviews/large cohorts), **Moderate** (a single named
study or RCT), or **Preliminary** (animal/in-vitro/mechanistic) — inferred by
Claude's Stage 2 distillation from the language Stage 1 used, plus a verbatim
quoted phrase when the source text actually contains one (never invented). The
bottom of every plan card also names the specific source library used
(`topic.sourceLabel`) and shows a "live web search" badge when this response
actually pulled from the web, so a plan reads as sourced, not asserted.

## Conversational follow-up

Every plan card now has an "Ask a follow-up question" panel. It POSTs to the
same `/api/coach` function with `mode: 'followup'`, the current plan as
context, and the last few turns of chat history, and gets back a short (1-4
sentence) grounded answer — still escalation-checked, still eligible for the
same web search rules, but deliberately skipping the Stage 2 JSON distillation
(a free-form answer doesn't fit the Do this/Why/Watch for schema). Chat history
is kept per topic in `localStorage`.

## Today & Journal: a home that isn't a bare dashboard

- **Today** (new default landing view) — a hero greeting, and your 1-3
  lowest-adherence topics as actionable cards you can mark done *inline*,
  without opening the topic page, plus a compact glance-radar and a recent
  activity feed.
- **Journal** (new view) — a chronological timeline, grouped by day, of every
  plan generated, day marked done, full week completed, and level-up — the
  "so what have I actually been doing" view that a bare percentage sidebar
  couldn't answer.
- **Overview** (the old default dashboard) is still there, renamed in the nav —
  it's the full-size radar + stats view for when you want the whole picture
  rather than "what should I do right now."

## What I deliberately did not build this round (flagged, not silently dropped)

From the brainstorm you approved, these are real ideas I did **not** implement,
because they need infrastructure/credentials only you can provision, or are a
genuinely separate feature scope from this pass:

- **Weekly cross-topic synthesis digest** (an AI-written "here's your week
  across all 10 topics" summary) — a good Tier-2 follow-up, not done here.
- **Meal photo logging** (vision-model food recognition) — needs a vision-model
  call path and image storage/handling that don't exist yet.
- **Self-experiment daily rating capture** (e.g. rate energy 1-5 and correlate
  with actions taken) — needs a new data model, not done here.
- **Real accounts/backend, wearable OAuth (Oura/Whoop/Apple Health, etc.)** —
  already flagged in the brainstorm as needing infrastructure and credentials
  only you can set up; still out of scope for a `localStorage`-only MVP.

## Known gaps in the research library (flagged, not hidden)

- **Sleep Quality & Circadian Health** and **Physical Activity & Movement** have
  no dedicated adult research doc yet — they currently borrow adjacent findings
  from the Purpose document (see `data/topics.json`'s `knownLimitation` field,
  which is surfaced directly in the UI on those two topic pages). Worth sourcing
  properly before this goes further than a demo.
- The **early-childhood-development document** (`CG_FRANCE_2.0`) is deliberately
  excluded from every adult topic's source mapping — the original prompt-testing
  chat caught the coach citing a children's-sleep finding for an adult user, which
  is exactly the population-mismatch error Section 3 of the system prompt exists
  to prevent. It's not wired into any topic on purpose.
- The **Micronutrient & Vitamin Status** source doc is written in directive
  clinical dosing language ("if you carry variant X, take Y"). `data/topics.json`
  carries an explicit instruction forcing the model to reframe this as
  general-population research context, never personalized dosing — this is the
  one topic worth watching most closely for Section 4 (scope) compliance.

## Repo layout

```
data/
  system-prompt.md      the coaching system prompt (Sections 1-9)
  topics.json            the 10 topics: source mapping + per-topic emphasis
  sources/*.md           cleaned research libraries, one per source document
docs/research/           original uploaded PDFs/docx, kept for provenance
netlify/functions/
  coach.js               the two-stage pipeline + escalation checks
  lib/sources-bundle.json   generated — do not hand-edit, run npm run build:sources
public/                  the static frontend (vanilla HTML/CSS/JS, no build step)
scripts/build-sources.js  bundles data/ into the function-safe JSON + public topic list
```

## What's intentionally not built (MVP scope)

- No backend database — profile and adherence tracking live in `localStorage`.
  Fine for a single-device demo; a real account system is a follow-up.
- No **streaks** specifically — deliberately excluded (see the original design
  discussion: streak mechanics reward "not missing a day," which pressures users
  to fake compliance rather than recover from a missed one). Lifetime XP/levels
  *are* built (see "The experience layer" above) as the intentional replacement:
  they reward total real actions taken and never decrease.
- No rate limiting on `/api/coach` — acceptable for an internal demo, not for a
  public link. Add it (per-IP or per-session) before sharing broadly, since every
  request costs real OpenAI + Anthropic API spend.
