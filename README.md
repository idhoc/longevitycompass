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
  API with instructions to reshape it into `{do_this, why, evidence[], watch_for}`
  JSON and to add or change nothing factual. This is presentation-layer work, not
  research work.
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
- No streaks/badges/levels — deliberately excluded (see the original design
  discussion: streak mechanics reward "not missing a day," which pressures users
  to fake compliance rather than recover from a missed one).
- No rate limiting on `/api/coach` — acceptable for an internal demo, not for a
  public link. Add it (per-IP or per-session) before sharing broadly, since every
  request costs real OpenAI + Anthropic API spend.
