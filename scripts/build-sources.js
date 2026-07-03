#!/usr/bin/env node
// Bundles data/system-prompt.md, data/topics.json, and data/sources/*.md into a single
// JSON file that the Netlify function can `require()` directly. Requiring JSON (instead of
// reading files off disk at runtime) sidesteps Netlify Functions' bundling/path quirks —
// esbuild inlines the JSON at build time, so there's nothing to resolve in the Lambda sandbox.
//
// Run this again with `npm run build:sources` any time you edit data/system-prompt.md,
// data/topics.json, or data/sources/*.md.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCES_DIR = path.join(ROOT, 'data', 'sources');
const OUT_DIR = path.join(ROOT, 'netlify', 'functions', 'lib');
const OUT_FILE = path.join(OUT_DIR, 'sources-bundle.json');
const PUBLIC_TOPICS_OUT = path.join(ROOT, 'public', 'data', 'topics.json');

function main() {
  const systemPrompt = fs.readFileSync(path.join(ROOT, 'data', 'system-prompt.md'), 'utf8');
  const topics = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'topics.json'), 'utf8'));

  const sources = {};
  for (const file of fs.readdirSync(SOURCES_DIR)) {
    if (!file.endsWith('.md')) continue;
    const id = file.replace(/\.md$/, '');
    sources[id] = fs.readFileSync(path.join(SOURCES_DIR, file), 'utf8');
  }

  // Sanity-check: every source file a topic references must exist.
  for (const topic of topics) {
    for (const srcId of topic.sources) {
      if (!sources[srcId]) {
        throw new Error(`Topic "${topic.id}" references missing source file "${srcId}.md"`);
      }
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ systemPrompt, topics, sources }, null, 0));
  console.log(`Wrote ${OUT_FILE} (${fs.statSync(OUT_FILE).size} bytes)`);

  // Public-safe topic list for the frontend: id/label/icon only. Deliberately excludes
  // `emphasis`/`sources`/`knownLimitation` — that's prompt-engineering detail that belongs
  // server-side, not in a client-inspectable JS bundle.
  const publicTopics = topics.map(({ id, label, icon, knownLimitation, description }) => ({ id, label, icon, knownLimitation: knownLimitation || null, description: description || null }));
  fs.mkdirSync(path.dirname(PUBLIC_TOPICS_OUT), { recursive: true });
  fs.writeFileSync(PUBLIC_TOPICS_OUT, JSON.stringify(publicTopics, null, 2));
  console.log(`Wrote ${PUBLIC_TOPICS_OUT}`);
}

main();
