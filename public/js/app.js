(function () {
  'use strict';

  const STORAGE = {
    profile: 'lc_profile_v2',
    topics: 'lc_topics_v1',
    settings: 'lc_settings_v2',
    onboarded: 'lc_onboarded_v1',
    journal: 'lc_journal_v1',
    chat: 'lc_chat_v1',
    globalChat: 'lc_global_chat_v1',
    synthesis: 'lc_synthesis_v1',
    reminderFired: 'lc_reminder_fired_v1',
    briefing: 'lc_briefing_v1',
    meals: 'lc_meals_v1',
    tourSeen: 'lc_tour_seen_v1',
  };
  const JOURNAL_MAX = 60;
  const HISTORY_MAX = 5;

  // ---------- genetic profile: 20 real, well-established gene-trait associations across 8
  // categories, each tagged with which topics can legitimately ground a response in it. Beyond
  // the original micronutrient-doc set, the newer entries (weight/muscle/circadian/stress/
  // caffeine) are NOT in any static source file — coach.js's topic emphasis explicitly tells
  // the model to reach for live web search (NIH/PubMed/etc.) to ground these when reported,
  // rather than silently ignoring them because no local doc mentions them.
  const GENE_VARIANTS = [
    { label: 'MTHFR C677T', desc: 'How your body processes folate (vitamin B9)', icon: 'droplet', category: 'Vitamins & minerals', relatedTopics: ['micronutrient'] },
    { label: 'VDR variant', desc: 'How sensitive you are to vitamin D', icon: 'sun', category: 'Vitamins & minerals', relatedTopics: ['micronutrient'] },
    { label: 'TRPM6 variant', desc: 'How well you absorb magnesium', icon: 'droplet', category: 'Vitamins & minerals', relatedTopics: ['micronutrient'] },
    { label: 'BCMO1 variant', desc: 'Converting beta-carotene into usable vitamin A', icon: 'droplet', category: 'Vitamins & minerals', relatedTopics: ['micronutrient'] },
    { label: 'GPX1 variant', desc: 'Selenium use and antioxidant defense', icon: 'droplet', category: 'Vitamins & minerals', relatedTopics: ['micronutrient'] },
    { label: 'Zinc transporter variant', desc: 'How well you absorb zinc', icon: 'droplet', category: 'Vitamins & minerals', relatedTopics: ['micronutrient'] },
    { label: 'APOE4 allele', desc: 'Fat metabolism and long-term brain/heart aging', icon: 'brain', category: 'Heart & brain', relatedTopics: ['micronutrient', 'cognitive'] },
    { label: 'FADS1 / ELOVL2 variant', desc: 'How efficiently you convert plant omega-3s', icon: 'brain', category: 'Heart & brain', relatedTopics: ['micronutrient', 'cognitive'] },
    { label: 'PEMT variant', desc: 'Your dietary choline requirement', icon: 'heartpulse', category: 'Heart & brain', relatedTopics: ['micronutrient'] },
    { label: 'HFE mutation', desc: 'Iron absorption and overload risk', icon: 'droplet', category: 'Iron regulation', relatedTopics: ['micronutrient'] },
    { label: 'FTO variant', desc: 'Appetite regulation and obesity-risk allele frequency', icon: 'scale', category: 'Metabolism & weight', relatedTopics: ['weight', 'nutrition'] },
    { label: 'MC4R variant', desc: 'Melanocortin satiety-signaling pathway', icon: 'scale', category: 'Metabolism & weight', relatedTopics: ['weight'] },
    { label: 'APOA2 variant', desc: 'Interacts with saturated fat intake to affect weight', icon: 'scale', category: 'Metabolism & weight', relatedTopics: ['weight', 'nutrition'] },
    { label: 'ACTN3 variant', desc: "Fast-twitch muscle fiber composition (the “sports gene”)", icon: 'walk', category: 'Muscle & performance', relatedTopics: ['activity'] },
    { label: 'ACE I/D variant', desc: 'Endurance vs. power response to training', icon: 'heartpulse', category: 'Muscle & performance', relatedTopics: ['activity', 'metabolic-cv'] },
    { label: 'CLOCK gene variant', desc: 'Core circadian clock timing / chronotype', icon: 'moon', category: 'Circadian & sleep', relatedTopics: ['sleep'] },
    { label: 'PER3 variant', desc: 'Sleep homeostasis and morning/evening preference', icon: 'moon', category: 'Circadian & sleep', relatedTopics: ['sleep'] },
    { label: 'COMT variant', desc: 'Dopamine clearance speed, tied to stress resilience', icon: 'hands', category: 'Stress & cognition', relatedTopics: ['purpose', 'cognitive'] },
    { label: 'BDNF variant', desc: 'Memory and exercise-induced brain plasticity', icon: 'brain', category: 'Stress & cognition', relatedTopics: ['cognitive', 'activity'] },
    { label: 'CYP1A2 variant', desc: 'Caffeine metabolism speed (fast vs. slow)', icon: 'bolt', category: 'Caffeine & stimulant metabolism', relatedTopics: ['sleep', 'metabolic-cv'] },
  ];
  const GENE_CATEGORIES = ['Vitamins & minerals', 'Heart & brain', 'Iron regulation', 'Metabolism & weight', 'Muscle & performance', 'Circadian & sleep', 'Stress & cognition', 'Caffeine & stimulant metabolism'];

  const DIET_OPTIONS = ['', 'Standard / omnivore', 'Mediterranean', 'Plant-based / vegetarian', 'Vegan', 'Low-carb / keto', 'Paleo', 'DASH', 'Other'];
  const GOAL_OPTIONS = ['', 'More energy', 'Better sleep', 'Weight management', 'Reduce stress', 'Sharper focus / cognition', 'Healthy aging / longevity', 'Heart health', 'Build strength / muscle', 'Other'];
  const CAFFEINE_OPTIONS = ['', 'None', '1 cup/day', '2-3 cups/day', '4+ cups/day'];
  const ALCOHOL_OPTIONS = ['', 'None', 'Occasionally', '1-2 drinks/week', '3-7 drinks/week', '8+ drinks/week'];
  const SMOKING_OPTIONS = ['', 'Never smoked', 'Former smoker', 'Current smoker'];
  const SCREEN_TIME_OPTIONS = ['', 'None', 'Under 30 min', '30-60 min', 'Over 60 min'];
  const STEPS_OPTIONS = ['', 'Under 3,000', '3,000-6,000', '6,000-10,000', 'Over 10,000'];
  const STRESSOR_OPTIONS = ['', 'Work', 'Finances', 'Family/relationships', 'Health', 'Sleep', 'Other'];
  const SUPPLEMENT_OPTIONS = ['', 'None', 'Multivitamin', 'Omega-3/fish oil', 'Vitamin D', 'Magnesium', 'Protein powder', 'Other'];

  const COACH_TONE_OPTIONS = [
    { key: 'balanced', title: 'Balanced', desc: 'The default coaching voice — clear and grounded, not clinical, not overly warm.' },
    { key: 'direct', title: 'Direct', desc: 'No preamble. Lead with the instruction. Short sentences.' },
    { key: 'encouraging', title: 'Encouraging', desc: 'Acknowledges effort first, treats setbacks as normal and recoverable.' },
    { key: 'clinical', title: 'Clinical', desc: 'Leads with mechanism/evidence, precise terminology, minimal motivational language.' },
  ];
  const ACCENT_THEMES = [
    { key: 'indigo', label: 'Indigo', swatch: '#5b5fef' },
    { key: 'teal', label: 'Teal', swatch: '#14b8a6' },
    { key: 'rose', label: 'Rose', swatch: '#ec4899' },
    { key: 'sunset', label: 'Sunset', swatch: '#f97316' },
  ];
  const TIME_BUDGET_OPTIONS = [
    { key: '2min', label: '~2 minutes' },
    { key: '10min', label: '~10 minutes' },
    { key: '30min', label: '~30 minutes' },
  ];

  let TOPICS = [];

  // ---------- life domains: 4 broad categories the 10 grounded topics fold into ----------
  // Humanity.health and Thrive both organize around 4-5 broad life domains (Movement/
  // Nutrition/Mind/Recovery, or Activity/Nutrition/Sleep/Stress/Social) rather than a long flat
  // topic list — this is the presentation layer that fixes "10 topics feels constricting"
  // without touching the underlying grounded research mapping (each topic still has its own
  // source library and prompt emphasis; a domain is just how they're grouped and browsed).
  const DOMAINS = [
    { key: 'movement', label: 'Movement', icon: 'walk', topics: ['activity', 'strength-training'], blurb: 'Physical activity and guided strength training — the most consistently established lever for healthy aging.' },
    { key: 'nutrition', label: 'Nutrition', icon: 'meal', topics: ['nutrition', 'gut-microbiome', 'micronutrient', 'weight', 'metabolic-cv'], blurb: 'What you eat, how your gut processes it, and how it shows up in your metabolic numbers.' },
    { key: 'mind', label: 'Mind', icon: 'brain', topics: ['purpose', 'cognitive'], blurb: 'Sense of purpose, social connection, and cognitive health — the best-evidenced longevity lever there is.' },
    { key: 'recovery', label: 'Recovery', icon: 'moon', topics: ['sleep', 'energy-mitochondrial', 'recovery-mobility'], blurb: 'Sleep, circadian rhythm, mobility, and the cellular energy systems that depend on real rest.' },
  ];
  function domainForTopic(topicId) {
    return DOMAINS.find((d) => d.topics.includes(topicId)) || null;
  }
  function domainScore(domain, scoresById) {
    const vals = domain.topics.map((tid) => scoresById[tid] || 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  // ---------- persistence ----------
  function getProfile() {
    try { return JSON.parse(localStorage.getItem(STORAGE.profile)) || {}; }
    catch { return {}; }
  }
  function setProfile(p) { localStorage.setItem(STORAGE.profile, JSON.stringify(p)); }

  function getSettings() {
    const defaults = {
      theme: 'system', alwaysExpandPlans: false, units: 'metric',
      accentTheme: 'indigo', coachTone: 'balanced', allowWebSearch: true,
      density: 'comfortable', reducedMotion: false, dailyReminder: false,
      voiceEngine: 'neural', voice: 'nova', autoSpeak: true,
    };
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(STORAGE.settings)) || {}) }; }
    catch { return defaults; }
  }
  function setSettings(s) { localStorage.setItem(STORAGE.settings, JSON.stringify(s)); }

  function applyAppearance() {
    const s = getSettings();
    if (s.theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else if (s.theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');

    document.documentElement.setAttribute('data-accent-theme', s.accentTheme || 'indigo');
    document.documentElement.setAttribute('data-density', s.density || 'comfortable');
    if (s.reducedMotion) document.documentElement.setAttribute('data-motion', 'reduced');
    else document.documentElement.removeAttribute('data-motion');
  }

  function isOnboarded() { return localStorage.getItem(STORAGE.onboarded) === 'true'; }
  function setOnboarded() { localStorage.setItem(STORAGE.onboarded, 'true'); }

  function getAllTopicState() {
    try { return JSON.parse(localStorage.getItem(STORAGE.topics)) || {}; }
    catch { return {}; }
  }
  function getTopicState(id) {
    const all = getAllTopicState();
    return all[id] || { days: [false, false, false, false, false, false, false], hasViewedFull: false, lastResult: null, history: [], timeBudget: null };
  }
  function setTopicState(id, state) {
    const all = getAllTopicState();
    all[id] = state;
    localStorage.setItem(STORAGE.topics, JSON.stringify(all));
  }

  function scoreForTopic(id) {
    const s = getTopicState(id);
    const done = s.days.filter(Boolean).length;
    return Math.round((done / 7) * 100);
  }

  // ---------- journal ----------
  function getJournal() {
    try { return JSON.parse(localStorage.getItem(STORAGE.journal)) || []; }
    catch { return []; }
  }
  function addJournalEntry(entry) {
    const list = getJournal();
    list.unshift({ ts: Date.now(), ...entry });
    localStorage.setItem(STORAGE.journal, JSON.stringify(list.slice(0, JOURNAL_MAX)));
  }

  // ---------- per-topic follow-up chat ----------
  function getAllChat() {
    try { return JSON.parse(localStorage.getItem(STORAGE.chat)) || {}; }
    catch { return {}; }
  }
  function getChatHistory(topicId) { return getAllChat()[topicId] || []; }
  function setChatHistory(topicId, history) {
    const all = getAllChat();
    all[topicId] = history.slice(-20);
    localStorage.setItem(STORAGE.chat, JSON.stringify(all));
  }

  // ---------- global cross-topic chat ----------
  function getGlobalChat() {
    try { return JSON.parse(localStorage.getItem(STORAGE.globalChat)) || []; }
    catch { return []; }
  }
  function setGlobalChat(history) { localStorage.setItem(STORAGE.globalChat, JSON.stringify(history.slice(-30))); }

  // ---------- weekly synthesis ----------
  function getSynthesis() {
    try { return JSON.parse(localStorage.getItem(STORAGE.synthesis)) || null; }
    catch { return null; }
  }
  function setSynthesis(s) { localStorage.setItem(STORAGE.synthesis, JSON.stringify(s)); }

  // ---------- daily briefing (ambient, auto-generated once per calendar day) ----------
  function getBriefing() {
    try { return JSON.parse(localStorage.getItem(STORAGE.briefing)) || null; }
    catch { return null; }
  }
  function setBriefing(b) { localStorage.setItem(STORAGE.briefing, JSON.stringify(b)); }

  // ---------- meal log (structured, for the running calorie/macro tracker) ----------
  function getMeals() {
    try { return JSON.parse(localStorage.getItem(STORAGE.meals)) || []; }
    catch { return []; }
  }
  function addMeal(entry) {
    const list = getMeals();
    list.unshift({ ts: Date.now(), ...entry });
    localStorage.setItem(STORAGE.meals, JSON.stringify(list.slice(0, 200)));
  }
  function todaysMeals() {
    const todayKey = new Date().toDateString();
    return getMeals().filter((m) => new Date(m.ts).toDateString() === todayKey);
  }

  // ---------- voice: Web Speech API helpers (feature-detected, no build step needed) ----------
  function getSpeechRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }
  // Voice quality is fundamentally capped by whatever TTS engine the browser/OS ships (there's
  // no ElevenLabs-style neural voice wired in here — that would need its own API key) — but two
  // honest, real improvements are possible with the built-in Web Speech API: (1) actually pick
  // the best-sounding installed voice instead of whatever the browser defaults to, and (2) speak
  // sentence-by-sentence with small natural rate/pitch variance per sentence instead of one flat
  // utterance, which reads as noticeably less monotone than the single-utterance approach.
  let _voicesCache = [];
  if ('speechSynthesis' in window) {
    const refreshVoices = () => { _voicesCache = window.speechSynthesis.getVoices(); };
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
  function pickBestVoice() {
    if (!_voicesCache.length) return null;
    const english = _voicesCache.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
    const pool = english.length ? english : _voicesCache;
    const scored = pool.map((v) => {
      const name = v.name.toLowerCase();
      let score = 0;
      if (/natural|neural|premium|enhanced|studio/.test(name)) score += 5;
      if (/google/.test(name)) score += 3;
      if (v.localService === false) score += 1;
      if (/compact|robot|zarvox|whisper/.test(name)) score -= 5;
      return { v, score };
    }).sort((a, b) => b.score - a.score);
    return scored[0].v;
  }
  const TTS_VOICE_OPTIONS = [
    { key: 'nova', label: 'Nova', desc: 'Bright and friendly — the default' },
    { key: 'echo', label: 'Echo', desc: 'Warm and conversational' },
    { key: 'alloy', label: 'Alloy', desc: 'Neutral and balanced' },
    { key: 'fable', label: 'Fable', desc: 'Expressive, storyteller-like' },
    { key: 'onyx', label: 'Onyx', desc: 'Deep and calm' },
    { key: 'shimmer', label: 'Shimmer', desc: 'Soft and gentle' },
  ];

  let _ttsAudio = null;
  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    if (_ttsAudio) { try { _ttsAudio.pause(); } catch {} _ttsAudio = null; }
  }

  function speakBrowser(text, onEnd) {
    if (!('speechSynthesis' in window) || !text) { if (onEnd) onEnd(); return; }
    window.speechSynthesis.cancel();
    const voice = pickBestVoice();
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
    if (!sentences.length) { if (onEnd) onEnd(); return; }
    let i = 0;
    function speakNext() {
      if (i >= sentences.length) { if (onEnd) onEnd(); return; }
      const utter = new SpeechSynthesisUtterance(sentences[i]);
      if (voice) utter.voice = voice;
      utter.rate = 0.97 + Math.random() * 0.08;
      utter.pitch = 0.96 + Math.random() * 0.07;
      utter.onend = () => { i += 1; speakNext(); };
      utter.onerror = () => { i += 1; speakNext(); };
      window.speechSynthesis.speak(utter);
    }
    speakNext();
  }

  // Fetches TTS audio as raw bytes (Blob), not JSON+base64 — a data: URI needs the whole
  // payload built into one giant string before an <audio> element can even be constructed;
  // a Blob URL lets the browser start from bytes it already has in memory, one less
  // encode/decode pass on the critical path between "text is ready" and "audio starts."
  // Returns null (never throws) on anything short of a real audio response, so callers can
  // fall straight through to the browser voice.
  async function fetchTtsBlobUrl(text, voice) {
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'speech', text, voice }),
      });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('audio')) return null;
      const buf = await res.arrayBuffer();
      if (!buf.byteLength) return null;
      return URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
    } catch (err) {
      return null;
    }
  }

  // Real neural voice (OpenAI TTS via the Netlify function) with a silent, automatic fallback
  // to the browser's built-in speechSynthesis — never a dead end if there's no API key, the
  // network call fails, or playback is blocked. "browser" engine in Settings skips straight to
  // the fallback path (useful offline or for users who prefer the free/local voice).
  async function speakText(text, onEnd) {
    if (!text) { if (onEnd) onEnd(); return; }
    stopSpeaking();
    const settings = getSettings();
    if (settings.voiceEngine !== 'browser') {
      const url = await fetchTtsBlobUrl(text, settings.voice || 'nova');
      if (url) {
        const audio = new Audio(url);
        _ttsAudio = audio;
        audio.onended = () => { URL.revokeObjectURL(url); _ttsAudio = null; if (onEnd) onEnd(); };
        audio.onerror = () => { URL.revokeObjectURL(url); _ttsAudio = null; speakBrowser(text, onEnd); };
        try { await audio.play(); return; } catch (err) { URL.revokeObjectURL(url); }
      }
    }
    speakBrowser(text, onEnd);
  }

  async function previewVoice(voiceKey) {
    stopSpeaking();
    const sample = "Hi, I'm your longevity coach. This is what I sound like.";
    const url = await fetchTtsBlobUrl(sample, voiceKey);
    if (url) {
      const audio = new Audio(url);
      _ttsAudio = audio;
      audio.onended = () => { URL.revokeObjectURL(url); _ttsAudio = null; };
      try { await audio.play(); return; } catch (err) { URL.revokeObjectURL(url); }
    }
    speakBrowser(sample);
  }

  // ---------- routing ----------
  function currentRoute() {
    const hash = location.hash.replace(/^#\/?/, '');
    if (!hash || hash === 'today') return { view: 'today' };
    if (hash === 'dashboard') return { view: 'dashboard' };
    if (hash === 'topics') return { view: 'topics' };
    if (hash === 'nutrition') return { view: 'nutrition' };
    if (hash === 'coach') return { view: 'coach' };
    if (hash === 'journal') return { view: 'journal' };
    if (hash === 'profile') return { view: 'profile' };
    if (hash === 'settings') return { view: 'settings' };
    const m = hash.match(/^topic\/(.+)$/);
    if (m) return { view: 'topic', id: m[1] };
    return { view: 'today' };
  }

  function navigate(hash) { location.hash = hash; }

  window.addEventListener('hashchange', render);

  // PWA installability: Chrome/Edge/Android fire this instead of showing their own install UI
  // when the page calls preventDefault(), so we can surface an "Install" button in Settings
  // instead. Safari/iOS has no equivalent event — "Add to Home Screen" there is manual, so the
  // button stays disabled with an explanatory note on browsers that never fire this.
  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById('install-app-btn')?.removeAttribute('disabled');
  });

  applyAppearance();

  async function boot() {
    try {
      const res = await fetch('data/topics.json');
      TOPICS = await res.json();
    } catch (e) {
      document.getElementById('main').innerHTML = '<div class="empty-state">Could not load topic list.</div>';
      return;
    }
    render();
    maybeFireDailyReminder();
    if (!isOnboarded()) renderOnboardingModal();
  }

  // ---------- rail navigation (replaces the old wide topic-list sidebar) ----------
  // ---------- first-login guided tour (spotlight + tooltip over the nav) ----------
  // A passive walkthrough of what each tab actually does, not just what it's labeled — the
  // nav rail is always present in the DOM (as a side rail on desktop, a bottom bar on mobile),
  // so every step targets a rail link and needs no page navigation, which keeps this robust
  // against timing/render-order issues. Any step whose target isn't found is skipped rather
  // than shown broken.
  const TOUR_STEPS = [
    { title: 'Welcome to Longevity Compass', body: "Here's a 30-second tour of what everything does — skip anytime from the corner." },
    { selector: 'a[href="#/today"]', title: 'Today', body: 'Your daily home base: top priorities, a quick AI morning briefing, and one-tap logging for whatever you did today.' },
    { selector: 'a[href="#/coach"]', title: 'Coach', body: 'Talk or type with your AI coach any time. It sees your whole profile, not just one topic, so you can ask anything.' },
    { selector: 'a[href="#/dashboard"]', title: 'Overview', body: 'Your compass, as a real 3D globe — drag to rotate it. Each glowing marker is a topic; brighter means better adherence that week.' },
    { selector: 'a[href="#/topics"]', title: 'Domains', body: '12 research-backed topics, grouped into 4 broad areas: Movement, Nutrition, Mind, and Recovery.' },
    { selector: 'a[href="#/nutrition"]', title: 'Meal Log', body: 'Snap a photo of a meal for an instant estimate of calories and macros, plus a running total for the day.' },
    { selector: 'a[href="#/journal"]', title: 'Journal', body: "A running timeline of everything you've done and generated — a real record, not just a streak count." },
    { selector: 'a[href="#/profile"]', title: 'My Profile', body: 'The details that make every plan specific to you — lifestyle, goals, even genetics if you have them. Editable any time.' },
    { selector: 'a[href="#/settings"]', title: 'Settings', body: "Tune the coach's voice, appearance, coaching tone, and how much detail you see by default." },
    { title: "You're all set", body: 'Open a topic, tap Coach, or just start with Today. You can replay this tour any time from Settings.' },
  ];

  function positionTourTooltip(tooltip, rect) {
    const margin = 16;
    const vw = window.innerWidth, vh = window.innerHeight;
    const tw = tooltip.offsetWidth || 300;
    const th = tooltip.offsetHeight || 140;
    let top, left;
    if (rect.right + margin + tw < vw) {
      left = rect.right + margin;
      top = Math.min(Math.max(rect.top, margin), Math.max(margin, vh - th - margin));
    } else if (rect.top - margin - th > 0) {
      top = rect.top - margin - th;
      left = Math.min(Math.max(rect.left, margin), Math.max(margin, vw - tw - margin));
    } else {
      top = Math.min(rect.bottom + margin, vh - th - margin);
      left = Math.min(Math.max(rect.left, margin), Math.max(margin, vw - tw - margin));
    }
    tooltip.style.top = Math.max(margin, top) + 'px';
    tooltip.style.left = Math.max(margin, left) + 'px';
  }

  function startAppTour() {
    let idx = 0;
    const highlight = document.createElement('div');
    highlight.className = 'tour-highlight';
    const tooltip = document.createElement('div');
    tooltip.className = 'tour-tooltip';
    document.body.appendChild(highlight);
    document.body.appendChild(tooltip);

    function cleanup() {
      highlight.remove();
      tooltip.remove();
      localStorage.setItem(STORAGE.tourSeen, 'true');
      window.removeEventListener('resize', reposition);
    }
    function reposition() { showStep(idx); }
    window.addEventListener('resize', reposition);

    function showStep(i) {
      if (i < 0) i = 0;
      if (i >= TOUR_STEPS.length) { cleanup(); return; }
      const step = TOUR_STEPS[i];
      const target = step.selector ? document.querySelector(step.selector) : null;
      if (step.selector && !target) { showStep(i + 1); return; }
      idx = i;

      tooltip.innerHTML = `
        <div class="tour-step-count">Step ${idx + 1} of ${TOUR_STEPS.length}</div>
        <div class="tour-title">${escapeHtml(step.title)}</div>
        <div class="tour-body">${escapeHtml(step.body)}</div>
        <div class="tour-controls">
          <button type="button" class="btn-text-clear" id="tour-skip">Skip tour</button>
          <div style="display:flex;gap:8px">
            ${idx > 0 ? '<button type="button" class="btn btn-secondary" id="tour-back">Back</button>' : ''}
            <button type="button" class="btn btn-primary" id="tour-next">${idx === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}</button>
          </div>
        </div>
      `;
      tooltip.querySelector('#tour-skip').addEventListener('click', cleanup);
      tooltip.querySelector('#tour-next').addEventListener('click', () => showStep(idx + 1));
      const backBtn = tooltip.querySelector('#tour-back');
      if (backBtn) backBtn.addEventListener('click', () => showStep(idx - 1));

      if (target) {
        const rect = target.getBoundingClientRect();
        highlight.style.display = '';
        highlight.style.top = (rect.top - 6) + 'px';
        highlight.style.left = (rect.left - 6) + 'px';
        highlight.style.width = (rect.width + 12) + 'px';
        highlight.style.height = (rect.height + 12) + 'px';
        tooltip.classList.remove('tour-tooltip-centered');
        positionTourTooltip(tooltip, rect);
      } else {
        highlight.style.display = 'none';
        tooltip.classList.add('tour-tooltip-centered');
        tooltip.style.top = '';
        tooltip.style.left = '';
      }
    }

    showStep(0);
  }

  function maybeStartTour() {
    if (localStorage.getItem(STORAGE.tourSeen) === 'true') return;
    setTimeout(() => startAppTour(), 500);
  }

  function renderRail(route) {
    const el = document.getElementById('sidebar');
    const navItems = [
      { key: 'today', icon: 'bolt', label: 'Today' },
      { key: 'coach', icon: 'mic', label: 'Coach' },
      { key: 'dashboard', icon: 'home', label: 'Overview' },
      { key: 'topics', icon: 'atom', label: 'Domains' },
      { key: 'nutrition', icon: 'meal', label: 'Meal Log' },
      { key: 'journal', icon: 'leaf', label: 'Journal' },
      { key: 'profile', icon: 'user', label: 'My profile' },
      { key: 'settings', icon: 'settings', label: 'Settings' },
    ];
    let html = `
      <div class="rail-brand">
        <span class="rail-brand-mark">${lcIcon('heart', 18)}</span>
        <span class="rail-brand-word">Longevity Compass</span>
      </div>
    `;
    for (const item of navItems) {
      const active = route.view === item.key ? 'active' : '';
      if (item.action) {
        html += `<button type="button" class="rail-link ${active}" data-rail-action="${item.action}">${lcIcon(item.icon, 20)}<span class="rail-label">${item.label}</span></button>`;
      } else {
        html += `<a class="rail-link ${active}" href="#/${item.key}">${lcIcon(item.icon, 20)}<span class="rail-label">${item.label}</span></a>`;
      }
    }
    html += '<div class="rail-spacer"></div>';
    el.innerHTML = html;
  }

  // ---------- wellness age estimate (Humanity.health-inspired, but honestly scoped) ----------
  // Humanity's "Biological Age" claims validation against real-world outcomes from wearable
  // data + blood tests — this app has neither. This is deliberately NOT presented as that: a
  // transparent, entirely client-side directional estimate from self-reported lifestyle
  // factors and actual tracked adherence, with every point of adjustment shown, not a black box.
  function computeWellnessAge(profile, avgAdherence) {
    const age = Number(profile.age);
    if (!Number.isFinite(age) || age <= 0) return null;
    const factors = [];
    const add = (label, pts) => { if (pts !== 0) factors.push({ label, pts }); };

    const activityPts = { sedentary: 2, light: 0.5, moderate: -1, active: -2.5 }[profile.activityLevel];
    if (activityPts !== undefined) add(`Activity level: ${profile.activityLevel}`, activityPts);

    const sleep = Number(profile.sleepHours);
    if (Number.isFinite(sleep)) {
      if (sleep < 6) add(`Sleep: ${sleep}h/night`, 2);
      else if (sleep < 7) add(`Sleep: ${sleep}h/night`, 0.5);
      else if (sleep <= 9) add(`Sleep: ${sleep}h/night`, -1);
      else add(`Sleep: ${sleep}h/night`, 0.5);
    }

    const smokingPts = { 'Current smoker': 4, 'Former smoker': 1, 'Never smoked': 0 }[profile.smokingStatus];
    if (smokingPts !== undefined) add(`Smoking: ${profile.smokingStatus}`, smokingPts);

    const stressPts = { high: 1.5, moderate: 0.5, low: -0.5 }[profile.stressLevel];
    if (stressPts !== undefined) add(`Stress level: ${profile.stressLevel}`, stressPts);

    if (['Mediterranean', 'DASH', 'Plant-based / vegetarian', 'Vegan'].includes(profile.dietPattern)) add(`Diet pattern: ${profile.dietPattern}`, -1.5);

    const alcoholPts = { '8+ drinks/week': 1.5, '3-7 drinks/week': 0.5 }[profile.alcoholFrequency];
    if (alcoholPts !== undefined) add(`Alcohol: ${profile.alcoholFrequency}`, alcoholPts);

    if (typeof avgAdherence === 'number') {
      if (avgAdherence >= 70) add('Real tracked adherence this week: high', -1.5);
      else if (avgAdherence >= 40) add('Real tracked adherence this week: moderate', -0.5);
    }

    const delta = factors.reduce((s, f) => s + f.pts, 0);
    const clamped = Math.max(-10, Math.min(15, delta));
    const wellnessAge = Math.round((age + clamped) * 10) / 10;
    return { age, wellnessAge, delta: Math.round(clamped * 10) / 10, factors };
  }

  function renderWellnessAgeHtml(result) {
    if (!result) {
      return `<div class="card wellness-age-card wellness-age-empty"><span>${lcIcon('dna', 18)}</span><div><div class="wellness-age-empty-title">Add your age in My Profile</div><div class="wellness-age-empty-desc">to see a transparent wellness-age estimate — not a lab test, just your own lifestyle factors shown plainly.</div></div></div>`;
    }
    const sign = result.delta > 0 ? '+' : '';
    const tone = result.delta < 0 ? 'good' : result.delta > 0 ? 'warn' : 'neutral';
    return `
      <div class="card wellness-age-card">
        <div class="wellness-age-label">${lcIcon('dna', 15)} Wellness age estimate</div>
        <div class="wellness-age-row">
          <div class="wellness-age-num">${result.wellnessAge}<span class="wellness-age-unit">yrs</span></div>
          <div class="wellness-age-delta wellness-age-delta-${tone}">${sign}${result.delta} vs. your age (${result.age})</div>
        </div>
        <div class="wellness-age-note">A transparent, self-reported estimate — not a lab-validated biological age test. Every factor below is shown, nothing hidden:</div>
        ${result.factors.length ? `<div class="wellness-age-factors">${result.factors.map((f) => `<div class="wellness-age-factor"><span>${escapeHtml(f.label)}</span><span class="${f.pts < 0 ? 'wellness-age-factor-good' : 'wellness-age-factor-warn'}">${f.pts > 0 ? '+' : ''}${f.pts}</span></div>`).join('')}</div>` : '<div class="wellness-age-note">No adjusting factors yet — fill in Lifestyle in My Profile.</div>'}
      </div>
    `;
  }

  // ---------- overview (full radar + stats) ----------
  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Still up';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  // Mounts the 3D globe compass into #sphere-host once the module has loaded, falling back to
  // the flat SVG dial (radar.js) if WebGL isn't available. Guards every async continuation with
  // a DOM-attachment check since the user may navigate away before the module resolves.
  let dashboardSphere = null;
  function mountCompass(scores) {
    const host = document.getElementById('sphere-host');
    const radarHost = document.getElementById('radar-svg');
    const readout = document.getElementById('sphere-readout');
    if (!host || !window.LC_sphereReady) {
      if (radarHost) { radarHost.style.display = ''; renderRadar(radarHost, TOPICS, scores, { size: 480 }); wireRadarClicks(); }
      return;
    }
    window.LC_sphereReady.then((api) => {
      if (!document.body.contains(host)) return;
      if (!api || !api.supportsWebGL()) {
        if (readout) readout.style.display = 'none';
        radarHost.style.display = '';
        renderRadar(radarHost, TOPICS, scores, { size: 480 });
        wireRadarClicks();
        return;
      }
      dashboardSphere = api.init(host, TOPICS, scores, {
        onTopicClick: (topicId) => navigate(`/topic/${topicId}`),
        onTopicHover: (topicId) => {
          if (readout) readout.classList.toggle('sphere-readout-dim', !!topicId);
        },
      });
    });
  }

  // Mounts the WebGL shader orb into a `.orb-3d-host` span inside a `.voice-orb` button, falling
  // back to the existing CSS blurred-gradient layers (already in the markup, untouched) if
  // WebGL isn't available. onReady receives the controller (or null on fallback) so the caller
  // can start forwarding state changes to it.
  function mountOrb3D(hostEl, onReady) {
    if (!hostEl || !window.LC_orbReady) { onReady(null); return; }
    window.LC_orbReady.then((api) => {
      if (!document.body.contains(hostEl) || !api || !api.supportsWebGL()) { onReady(null); return; }
      onReady(api.mount(hostEl));
    });
  }

  function wireRadarClicks() {
    document.querySelectorAll('.radar-point').forEach((el) => {
      el.addEventListener('click', () => navigate(`/topic/${el.dataset.topic}`));
    });
  }

  function renderDashboard() {
    const main = document.getElementById('main');
    const profile = getProfile();
    const scores = TOPICS.map((t) => scoreForTopic(t.id));
    const focusOrder = TOPICS.map((t, i) => ({ t, score: scores[i] }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    const onTrack = scores.filter((s) => s >= 50).length;
    const notStarted = scores.filter((s) => s === 0).length;
    const bestIdx = scores.reduce((best, s, i) => (s > scores[best] ? i : best), 0);
    const bestLabel = scores[bestIdx] > 0 ? shortLabel(TOPICS[bestIdx]) : '—';

    const subline = profile.primaryGoal
      ? `Here's where things stand with your goal: ${escapeHtml(profile.primaryGoal)}.`
      : `Fills in as you complete each topic's daily action.`;
    const avgAdherence = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const wellnessAge = computeWellnessAge(profile, avgAdherence);

    main.innerHTML = `
      <h1>Overview</h1>
      <p class="subtitle">${subline}</p>
      <div class="stat-row">
        <div class="stat-tile"><div class="stat-value">${onTrack}<span class="stat-of">/${TOPICS.length}</span></div><div class="stat-label">Topics on track</div></div>
        <div class="stat-tile"><div class="stat-value">${notStarted}</div><div class="stat-label">Not started this week</div></div>
        <div class="stat-tile"><div class="stat-value stat-value-text">${escapeHtml(bestLabel)}</div><div class="stat-label">Strongest topic</div></div>
      </div>
      ${renderWellnessAgeHtml(wellnessAge)}
      <div class="grid-radar">
        <div class="card radar-wrap">
          <div id="sphere-host" class="sphere-compass-host">
            <div class="sphere-readout" id="sphere-readout">
              <div class="sphere-readout-num">${Math.round(avgAdherence)}%</div>
              <div class="sphere-readout-label">Strongest: ${escapeHtml(bestLabel)}</div>
              <div class="sphere-readout-hint">Drag to rotate · click a marker to open</div>
            </div>
            <div id="radar-svg" class="radar-chart-host" style="display:none"></div>
          </div>
        </div>
        <div class="card">
          <h2>Focus today</h2>
          <p class="subtitle" style="margin-bottom:0">Your three lowest-adherence topics right now.</p>
          <div class="focus-list" id="focus-list"></div>
        </div>
      </div>
    `;

    mountCompass(scores);

    const focusList = document.getElementById('focus-list');
    focusList.innerHTML = focusOrder.map(({ t, score }) => `
      <div class="focus-item" data-topic="${t.id}">
        <span class="icon-badge" style="color:${topicAccent(t.id)};background:${topicAccent(t.id)}22">${lcIcon(t.icon, 20)}</span>
        <span class="focus-text">
          <div class="focus-title">${t.label}</div>
          <div class="focus-pct">${score}% adherence this week</div>
        </span>
        ${lcIcon('chevron', 16)}
      </div>
    `).join('');
    focusList.querySelectorAll('.focus-item').forEach((el) => {
      el.addEventListener('click', () => navigate(`/topic/${el.dataset.topic}`));
    });
  }

  // ---------- topics grid (replaces the old sidebar topic list) ----------
  function renderTopicsGrid() {
    const main = document.getElementById('main');
    main.innerHTML = `
      <h1>Domains</h1>
      <p class="subtitle">Four broad areas, each backed by specific research-grounded topics underneath — open a domain to see (and act on) what's inside it.</p>
      <div class="domains-grid" id="domains-grid"></div>
    `;
    const grid = document.getElementById('domains-grid');
    const scoresById = {};
    TOPICS.forEach((t) => { scoresById[t.id] = scoreForTopic(t.id); });

    grid.innerHTML = DOMAINS.map((d, i) => {
      const pct = domainScore(d, scoresById);
      const memberTopics = TOPICS.filter((t) => d.topics.includes(t.id));
      return `
        <div class="domain-card stagger-item" style="--i:${i};--tgc-accent:var(--accent)" data-domain="${d.key}">
          <div class="domain-card-top">
            <span class="topic-grid-icon">${lcIcon(d.icon, 24)}</span>
            ${renderMiniRing(pct, 30)}
          </div>
          <div class="topic-grid-label">${escapeHtml(d.label)}</div>
          <div class="topic-grid-desc">${escapeHtml(d.blurb)}</div>
          <div class="topic-grid-footer"><span class="topic-grid-pct">${pct}% this week</span><span class="domain-card-chevron">${lcIcon('chevron', 14)}</span></div>
          <div class="domain-topics-list" id="domain-topics-${d.key}" style="display:none">
            ${memberTopics.map((t) => `
              <div class="domain-topic-row" data-topic="${t.id}">
                <span style="color:${topicAccent(t.id)}">${lcIcon(t.icon, 16)}</span>
                <span class="domain-topic-row-label">${escapeHtml(t.label)}</span>
                <span class="domain-topic-row-pct">${scoresById[t.id]}%</span>
                ${lcIcon('chevron', 13)}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.domain-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.domain-topic-row')) return;
        const list = card.querySelector('.domain-topics-list');
        const chevron = card.querySelector('.domain-card-chevron');
        const open = list.style.display !== 'none';
        list.style.display = open ? 'none' : 'block';
        if (chevron) chevron.style.transform = open ? '' : 'rotate(90deg)';
      });
      card.querySelectorAll('.domain-topic-row').forEach((row) => {
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          navigate(`/topic/${row.dataset.topic}`);
        });
      });
    });
  }

  // ---------- profile: sectioned fields (Basics / Lifestyle / Cardio-metabolic / Goal) ----------
  const PROFILE_FIELDS = [
    { key: 'age', label: 'Age', type: 'number', section: 'basics' },
    { key: 'sex', label: 'Sex', type: 'select', options: ['', 'female', 'male', 'other'], section: 'basics' },
    { key: 'weightKg', label: 'Weight', type: 'weight', section: 'basics' },
    { key: 'heightCm', label: 'Height', type: 'height', section: 'basics' },
    { key: 'dietPattern', label: 'Current diet pattern', type: 'select-other', options: DIET_OPTIONS, section: 'lifestyle' },
    { key: 'dietaryRestrictions', label: 'Allergies / foods you avoid', type: 'text', section: 'lifestyle' },
    { key: 'activityLevel', label: 'Activity level', type: 'select', options: ['', 'sedentary', 'light', 'moderate', 'active'], section: 'lifestyle' },
    { key: 'workoutEnvironment', label: 'Where/how you actually train', type: 'text', section: 'lifestyle' },
    { key: 'physicalLimitations', label: 'Injuries or movements to avoid', type: 'text', section: 'lifestyle' },
    { key: 'sleepHours', label: 'Typical sleep (hrs/night)', type: 'number', step: '0.5', section: 'lifestyle' },
    { key: 'sleepDisruptor', label: 'Biggest thing disrupting your sleep', type: 'text', section: 'lifestyle' },
    { key: 'stressLevel', label: 'Typical stress level', type: 'select', options: ['', 'low', 'moderate', 'high'], section: 'lifestyle' },
    { key: 'caffeineIntake', label: 'Caffeine intake', type: 'select', options: CAFFEINE_OPTIONS, section: 'lifestyle' },
    { key: 'alcoholFrequency', label: 'Alcohol frequency', type: 'select', options: ALCOHOL_OPTIONS, section: 'lifestyle' },
    { key: 'smokingStatus', label: 'Smoking status', type: 'select', options: SMOKING_OPTIONS, section: 'lifestyle' },
    { key: 'screenTimeBeforeBed', label: 'Screen time before bed', type: 'select', options: SCREEN_TIME_OPTIONS, section: 'lifestyle' },
    { key: 'dailySteps', label: 'Typical daily steps', type: 'select', options: STEPS_OPTIONS, section: 'lifestyle' },
    { key: 'mainStressor', label: 'Main current stressor', type: 'select-other', options: STRESSOR_OPTIONS, section: 'lifestyle' },
    { key: 'supplementUse', label: 'Current supplement use', type: 'select-other', options: SUPPLEMENT_OPTIONS, section: 'lifestyle' },
    { key: 'restingHeartRate', label: 'Resting heart rate (bpm, optional)', type: 'number', section: 'cardio' },
    { key: 'systolicBP', label: 'Systolic BP (optional)', type: 'number', section: 'cardio' },
    { key: 'diastolicBP', label: 'Diastolic BP (optional)', type: 'number', section: 'cardio' },
    { key: 'primaryGoal', label: 'Your main goal right now', type: 'select-other', options: GOAL_OPTIONS, section: 'goal' },
  ];
  const PROFILE_SECTIONS = [
    { key: 'basics', heading: 'Basics', icon: 'user' },
    { key: 'lifestyle', heading: 'Lifestyle', icon: 'walk' },
    { key: 'cardio', heading: 'Cardio-metabolic (optional)', icon: 'heartpulse' },
    { key: 'goal', heading: 'Your goal', icon: 'bolt' },
  ];

  function kgToLb(kg) { return Math.round(kg * 2.20462 * 10) / 10; }
  function lbToKg(lb) { return Math.round((lb / 2.20462) * 10) / 10; }
  function cmToIn(cm) { return Math.round(cm / 2.54); }
  function inToCm(inches) { return Math.round(inches * 2.54); }

  function renderField(f, profile, idPrefix) {
    const val = profile[f.key] ?? '';
    const units = getSettings().units || 'metric';

    if (f.type === 'weight') {
      const isImperial = units === 'imperial';
      const display = val === '' ? '' : (isImperial ? kgToLb(Number(val)) : val);
      return `<div class="field"><label>Weight (${isImperial ? 'lbs' : 'kg'})</label><input name="${f.key}" type="number" step="0.1" value="${display}"/></div>`;
    }
    if (f.type === 'height') {
      const isImperial = units === 'imperial';
      const display = val === '' ? '' : (isImperial ? cmToIn(Number(val)) : val);
      return `<div class="field"><label>Height (${isImperial ? 'in' : 'cm'})</label><input name="${f.key}" type="number" step="1" value="${display}"/></div>`;
    }
    if (f.type === 'select') {
      return `<div class="field"><label>${f.label}</label><select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${o === val ? 'selected' : ''}>${o || '—'}</option>`).join('')}</select></div>`;
    }
    if (f.type === 'select-other') {
      const isOther = val && !f.options.includes(val);
      const selectVal = isOther ? 'Other' : val;
      return `
        <div class="field">
          <label>${f.label}</label>
          <select name="${f.key}" data-other-toggle="${f.key}-other-row">${f.options.map((o) => `<option value="${o}" ${o === selectVal ? 'selected' : ''}>${o || '—'}</option>`).join('')}</select>
        </div>
        <div class="field" id="${idPrefix}-${f.key}-other-row" style="${selectVal === 'Other' ? '' : 'display:none'}">
          <label>${f.label} (please specify)</label>
          <input name="${f.key}Other" type="text" value="${isOther ? escapeHtml(val) : ''}"/>
        </div>
      `;
    }
    return `<div class="field"><label>${f.label}</label><input name="${f.key}" type="${f.type}" ${f.step ? `step="${f.step}"` : ''} value="${escapeHtml(String(val))}"/></div>`;
  }

  function buildFieldsHtml(sectionKey, profile, idPrefix) {
    const fields = PROFILE_FIELDS.filter((f) => f.section === sectionKey);
    return `<div class="form-grid">${fields.map((f) => renderField(f, profile, idPrefix)).join('')}</div>`;
  }

  function buildFlagsHtml(profile, idPrefix) {
    return `
      <div class="form-grid">
        <div class="field checkbox" style="grid-column:1/-1"><input type="checkbox" name="chestPain" id="${idPrefix}-chestPain" ${profile.chestPain ? 'checked' : ''}/><label for="${idPrefix}-chestPain">I'm currently experiencing chest pain</label></div>
        <div class="field checkbox" style="grid-column:1/-1"><input type="checkbox" name="suicidalIdeation" id="${idPrefix}-suicidalIdeation" ${profile.suicidalIdeation ? 'checked' : ''}/><label for="${idPrefix}-suicidalIdeation">I'm having thoughts of harming myself</label></div>
      </div>
    `;
  }

  function buildGenePanelHtml(profile, idPrefix) {
    const gv = profile.geneticVariants || [];
    return `
      <fieldset class="gene-panel">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <legend>${lcIcon('dna', 16)} Genetic profile (optional) — ${GENE_VARIANTS.length} variants across 8 categories</legend>
          <button type="button" class="btn-text-clear" data-clear-genetics>Clear all</button>
        </div>
        <p class="gene-hint">If a consumer or clinical genetic test (23andMe, clinical panel, etc.) has told you that you carry any of these, select them. This is never used to diagnose — only to point to matching research for that trait, only for the topics tagged on each row. Search to find one quickly.</p>
        <input type="text" class="gene-search" placeholder="Search genes or traits…" data-gene-search/>
        <div data-gene-categories>
          ${GENE_CATEGORIES.map((cat, ci) => {
            const items = GENE_VARIANTS.filter((v) => v.category === cat);
            const hasSelected = items.some((v) => gv.includes(v.label));
            return `
              <div class="gene-category ${hasSelected ? 'open' : ''}" data-gene-category>
                <div class="gene-category-toggle" data-gene-toggle>
                  <span class="gene-category-toggle-left">${escapeHtml(cat)} <span class="gene-category-count">(${items.length})</span></span>
                  <span class="gene-category-chevron">${lcIcon('chevron', 14)}</span>
                </div>
                <div class="gene-category-body">
                  ${items.map((v, i) => `
                    <label class="gene-row ${gv.includes(v.label) ? 'active' : ''}" data-gene-row data-gene-search-text="${escapeHtml((v.label + ' ' + v.desc).toLowerCase())}">
                      <input type="checkbox" name="geneticVariants" value="${escapeHtml(v.label)}" id="${idPrefix}-gene-${ci}-${i}" ${gv.includes(v.label) ? 'checked' : ''}/>
                      <span class="gene-row-icon">${lcIcon(v.icon, 16)}</span>
                      <span class="gene-row-text">
                        <span class="gene-row-title">${escapeHtml(v.label)}</span>
                        <span class="gene-row-desc">${escapeHtml(v.desc)}</span>
                        <span class="gene-row-topics">${v.relatedTopics.map((tid) => {
                          const t = TOPICS.find((x) => x.id === tid);
                          return t ? `<span class="gene-row-topic-tag">${escapeHtml(shortLabel(t))}</span>` : '';
                        }).join('')}</span>
                      </span>
                      <span class="gene-row-check">${lcIcon('check', 13)}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </fieldset>
    `;
  }

  function wireProfileForm(form, idPrefix) {
    form.querySelectorAll('[data-other-toggle]').forEach((select) => {
      const row = document.getElementById(`${idPrefix}-${select.dataset.otherToggle}`);
      if (!row) return;
      select.addEventListener('change', () => {
        row.style.display = select.value === 'Other' ? '' : 'none';
      });
    });
    form.querySelectorAll('.gene-row input').forEach((cb) => {
      cb.addEventListener('change', () => cb.closest('.gene-row').classList.toggle('active', cb.checked));
    });
    form.querySelectorAll('[data-gene-toggle]').forEach((toggle) => {
      toggle.addEventListener('click', () => toggle.closest('.gene-category').classList.toggle('open'));
    });
    const searchInput = form.querySelector('[data-gene-search]');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        form.querySelectorAll('[data-gene-category]').forEach((cat) => {
          let anyVisible = false;
          cat.querySelectorAll('[data-gene-row]').forEach((row) => {
            const match = !q || row.dataset.geneSearchText.includes(q);
            row.style.display = match ? '' : 'none';
            if (match) anyVisible = true;
          });
          if (q && anyVisible) cat.classList.add('open');
        });
      });
    }
    const clearBtn = form.querySelector('[data-clear-genetics]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        form.querySelectorAll('.gene-row input').forEach((cb) => {
          cb.checked = false;
          cb.closest('.gene-row').classList.remove('active');
        });
      });
    }
  }

  function collectProfileFromForm(form) {
    const fd = new FormData(form);
    const units = getSettings().units || 'metric';
    const next = {};
    for (const f of PROFILE_FIELDS) {
      if (f.type === 'weight') {
        const raw = fd.get(f.key);
        next[f.key] = raw === '' || raw === null ? '' : (units === 'imperial' ? lbToKg(Number(raw)) : Number(raw));
      } else if (f.type === 'height') {
        const raw = fd.get(f.key);
        next[f.key] = raw === '' || raw === null ? '' : (units === 'imperial' ? inToCm(Number(raw)) : Number(raw));
      } else if (f.type === 'select-other') {
        const selected = fd.get(f.key) || '';
        next[f.key] = selected === 'Other' ? (fd.get(`${f.key}Other`) || 'Other') : selected;
      } else {
        next[f.key] = fd.get(f.key) || '';
      }
    }
    next.chestPain = fd.get('chestPain') === 'on';
    next.suicidalIdeation = fd.get('suicidalIdeation') === 'on';
    next.geneticVariants = fd.getAll('geneticVariants');
    return next;
  }

  function renderProfile() {
    const main = document.getElementById('main');
    const profile = getProfile();
    main.innerHTML = `
      <h1>My profile</h1>
      <p class="subtitle">This feeds every topic's coaching request — the more sections you fill in, the more specific every plan gets. Nothing here leaves your browser except when you request a plan, and it is never used to diagnose anything.</p>
      <div class="card">
        <form id="profile-form"></form>
        <div class="form-actions">
          <button type="submit" form="profile-form" class="btn btn-primary">Save profile</button>
          <span class="save-note" id="save-note">Saved</span>
        </div>
      </div>
    `;
    const form = document.getElementById('profile-form');
    form.innerHTML = PROFILE_SECTIONS.map((s) => `
      <div class="profile-section">
        <div class="profile-section-heading">${lcIcon(s.icon, 14)} ${escapeHtml(s.heading)}</div>
        ${buildFieldsHtml(s.key, profile, 'profile')}
      </div>
    `).join('')
      + `<div class="profile-section"><div class="profile-section-heading">${lcIcon('heartpulse', 14)} Safety check</div>${buildFlagsHtml(profile, 'profile')}</div>`
      + buildGenePanelHtml(profile, 'profile');
    wireProfileForm(form, 'profile');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      setProfile(collectProfileFromForm(form));
      const note = document.getElementById('save-note');
      note.classList.add('show');
      setTimeout(() => note.classList.remove('show'), 1500);
    });
  }

  // ---------- onboarding: cover + guided intake wizard ----------
  const WIZARD_STEPS = [
    { title: 'A few basics', desc: 'Age, sex, weight, height, and what you’re working toward.' },
    { title: 'Lifestyle context', desc: 'Optional, but the more you share here the more specific every plan gets.' },
    { title: 'Genetic profile', desc: 'Optional — only add what a real test has told you. Skip entirely if you have none.' },
    { title: 'Coaching style', desc: 'How should your coach talk to you? You can change this later in Settings.' },
    { title: 'You’re all set', desc: 'Review what you entered, then jump into your dashboard.' },
  ];

  function renderOnboardingModal() {
    const profile = getProfile();
    const settings = getSettings();
    let step = 0; // 0 = cover screen
    let chosenTone = settings.coachTone || 'balanced';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <div id="wizard-cover" class="onboard-cover">
          <div class="onboard-cover-mark">${lcIcon('heart', 34)}</div>
          <h1>Longevity Compass</h1>
          <p>An AI wellness coach that grounds every recommendation in real research and your own profile — across 10 longevity topics, from gut health to sense of purpose. A few details make every plan specific to you instead of generic; none of it is used to diagnose anything.</p>
          <div class="onboard-cover-pillars">
            <div class="onboard-pillar"><div class="onboard-pillar-icon">${lcIcon('dna', 18)}</div>Grounded in named research, not guesses</div>
            <div class="onboard-pillar"><div class="onboard-pillar-icon">${lcIcon('bolt', 18)}</div>Adapts to your adherence, week to week</div>
            <div class="onboard-pillar"><div class="onboard-pillar-icon">${lcIcon('hands', 18)}</div>Local to your browser — no account needed</div>
          </div>
          <button type="button" class="btn-text-clear" id="wizard-cover-skip" style="margin-top:18px">Skip intro, just take me in</button>
        </div>
        <div id="wizard-intake" style="display:none">
          <div class="coach-orb-stage" style="padding-top:4px">
            <button type="button" class="voice-orb" id="intake-orb" aria-label="Talk to your coach">
              <span class="orb-layer orb-layer-1"></span>
              <span class="orb-layer orb-layer-2"></span>
              <span class="orb-layer orb-layer-3"></span>
              <span class="orb-3d-host" id="intake-orb-3d"></span>
              <span class="orb-icon">${lcIcon('mic', 22)}</span>
            </button>
            <div class="voice-status" id="intake-voice-status">Tap to speak, or type below</div>
          </div>
          <div class="coach-transcript" id="intake-transcript" style="max-height:32vh"></div>
          <div class="coach-input-row">
            <input type="text" class="chat-input" id="intake-input" placeholder="Type your answer…" maxlength="300"/>
            <button class="btn btn-primary" id="intake-send">Send</button>
          </div>
          <p class="gene-hint" style="text-align:center;margin:14px 0 0">You can stop anytime and switch to the form below, or skip entirely — nothing here leaves your browser except to generate your plans.</p>
          <button type="button" class="btn-text-clear" id="intake-use-form" style="display:block;margin:8px auto 0">Prefer a form instead?</button>
        </div>
        <div id="wizard-body" style="display:none">
          <div class="wizard-progress">
            ${WIZARD_STEPS.map((_, i) => `<div class="wizard-dot" data-dot="${i + 1}"></div>`).join('')}
          </div>
          <h1 id="wizard-title"></h1>
          <p class="subtitle" id="wizard-desc"></p>
          <form id="onboarding-form">
            <div data-step-content="1">${buildFieldsHtml('basics', profile, 'onboard')}${buildFieldsHtml('goal', profile, 'onboard')}</div>
            <div data-step-content="2" style="display:none">${buildFieldsHtml('lifestyle', profile, 'onboard')}${buildFieldsHtml('cardio', profile, 'onboard')}${buildFlagsHtml(profile, 'onboard')}</div>
            <div data-step-content="3" style="display:none">${buildGenePanelHtml(profile, 'onboard')}</div>
            <div data-step-content="4" style="display:none">
              <div class="tone-options" id="onboard-tone-options">
                ${COACH_TONE_OPTIONS.map((t) => `
                  <div class="tone-option ${t.key === chosenTone ? 'active' : ''}" data-tone-choice="${t.key}">
                    <div class="tone-option-title">${escapeHtml(t.title)}</div>
                    <div class="tone-option-desc">${escapeHtml(t.desc)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
            <div data-step-content="5" style="display:none" id="wizard-review"></div>
          </form>
        </div>
        <div class="modal-actions" id="wizard-actions" style="display:none">
          <button type="button" class="btn btn-secondary" id="onboarding-skip">Skip for now</button>
          <div style="display:flex;gap:10px">
            <button type="button" class="btn btn-secondary" id="wizard-back" style="display:none">Back</button>
            <button type="button" class="btn btn-primary" id="wizard-next">Next</button>
            <button type="submit" form="onboarding-form" class="btn btn-primary" id="wizard-finish" style="display:none">Get started</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('#onboarding-form');
    wireProfileForm(form, 'onboard');
    overlay.querySelectorAll('#onboard-tone-options [data-tone-choice]').forEach((el) => {
      el.addEventListener('click', () => {
        chosenTone = el.dataset.toneChoice;
        overlay.querySelectorAll('#onboard-tone-options .tone-option').forEach((o) => o.classList.toggle('active', o.dataset.toneChoice === chosenTone));
      });
    });

    function showStep(n) {
      step = n;
      overlay.querySelectorAll('[data-step-content]').forEach((el) => {
        el.style.display = Number(el.dataset.stepContent) === n ? '' : 'none';
      });
      overlay.querySelectorAll('[data-dot]').forEach((dot) => {
        dot.classList.toggle('active', Number(dot.dataset.dot) === n);
        dot.classList.toggle('done', Number(dot.dataset.dot) < n);
      });
      overlay.querySelector('#wizard-title').textContent = WIZARD_STEPS[n - 1].title;
      overlay.querySelector('#wizard-desc').textContent = WIZARD_STEPS[n - 1].desc;
      overlay.querySelector('#wizard-back').style.display = n > 1 ? '' : 'none';
      overlay.querySelector('#wizard-next').style.display = n < WIZARD_STEPS.length ? '' : 'none';
      overlay.querySelector('#wizard-finish').style.display = n === WIZARD_STEPS.length ? '' : 'none';
      if (n === 5) renderReview();
      const activeEl = overlay.querySelector(`[data-step-content="${n}"]`);
      activeEl.classList.remove('step-fade');
      void activeEl.offsetWidth;
      activeEl.classList.add('step-fade');
    }

    function renderReview() {
      const p = collectProfileFromForm(form);
      const rows = [
        ['Age', p.age], ['Sex', p.sex], ['Diet pattern', p.dietPattern], ['Activity level', p.activityLevel],
        ['Main goal', p.primaryGoal], ['Genetic markers', p.geneticVariants.length ? p.geneticVariants.join(', ') : 'None selected'],
        ['Coaching style', COACH_TONE_OPTIONS.find((t) => t.key === chosenTone)?.title || 'Balanced'],
      ].filter(([, v]) => v);
      overlay.querySelector('#wizard-review').innerHTML = rows.length
        ? `<div class="review-list">${rows.map(([k, v]) => `<div class="review-row"><span class="review-key">${escapeHtml(k)}</span><span class="review-val">${escapeHtml(String(v))}</span></div>`).join('')}</div>`
        : `<p class="subtitle">Nothing entered yet — that's fine, you can fill this in later from My Profile.</p>`;
    }

    const beginBtn = document.createElement('button');
    beginBtn.type = 'button';
    beginBtn.className = 'btn btn-primary';
    beginBtn.style.cssText = 'display:block;margin:0 auto;padding:11px 28px;';
    beginBtn.textContent = 'Begin';
    overlay.querySelector('#wizard-cover').appendChild(beginBtn);
    beginBtn.addEventListener('click', () => {
      overlay.querySelector('#wizard-cover').style.display = 'none';
      overlay.querySelector('#wizard-intake').style.display = '';
      startIntake();
    });

    function goToForm(startAt) {
      overlay.querySelector('#wizard-cover').style.display = 'none';
      overlay.querySelector('#wizard-intake').style.display = 'none';
      overlay.querySelector('#wizard-body').style.display = '';
      overlay.querySelector('#wizard-actions').style.display = '';
      showStep(startAt || 1);
    }

    // Maps the AI's best-effort extraction onto the real form fields (not just localStorage)
    // so Back/Review later in the wizard shows what was actually said, and the final submit's
    // existing collectProfileFromForm() picks it up with zero special-casing.
    function applyExtractedToForm(extracted) {
      const selectOtherFields = ['primaryGoal', 'dietPattern', 'mainStressor'];
      const plainFields = ['activityLevel', 'stressLevel'];
      selectOtherFields.forEach((key) => {
        const val = extracted[key];
        if (!val) return;
        const el = form.elements[key];
        if (!el) return;
        const opts = Array.from(el.options || []).map((o) => o.value);
        if (opts.includes(val)) { el.value = val; return; }
        el.value = 'Other';
        const otherInput = form.elements[`${key}Other`];
        if (otherInput) otherInput.value = val;
        const otherRow = document.getElementById(`onboard-${key}-other-row`);
        if (otherRow) otherRow.style.display = '';
      });
      plainFields.forEach((key) => {
        const val = extracted[key];
        const el = form.elements[key];
        if (!val || !el) return;
        const opts = Array.from(el.options || []).map((o) => o.value);
        if (opts.includes(val)) el.value = val;
      });
      if (extracted.sleepHours && form.elements.sleepHours) {
        const n = parseFloat(extracted.sleepHours);
        if (Number.isFinite(n)) form.elements.sleepHours.value = n;
      }
      if (extracted.age && form.elements.age) {
        const n = parseInt(extracted.age, 10);
        if (Number.isFinite(n) && n > 0 && n < 120) form.elements.age.value = n;
      }
      // These have no dedicated form field, but buildUserMessage() surfaces every non-empty
      // profile key to the coach automatically — so storing them here is enough to shape every
      // future workout/nutrition/sleep plan, not just a display-only summary.
      const freeTextFields = ['dietaryRestrictions', 'workoutEnvironment', 'physicalLimitations', 'sleepDisruptor', 'selfDescription'];
      const toMerge = {};
      freeTextFields.forEach((key) => { if (extracted[key]) toMerge[key] = extracted[key]; });
      if (Object.keys(toMerge).length) {
        setProfile({ ...getProfile(), ...toMerge });
      }
    }

    function startIntake() {
      const transcript = overlay.querySelector('#intake-transcript');
      const input = overlay.querySelector('#intake-input');
      const sendBtn = overlay.querySelector('#intake-send');
      const orb = overlay.querySelector('#intake-orb');
      const voiceStatus = overlay.querySelector('#intake-voice-status');
      let history = [];
      let finished = false;
      let orb3d = null;
      mountOrb3D(overlay.querySelector('#intake-orb-3d'), (ctrl) => { orb3d = ctrl; if (ctrl) orb.classList.add('orb-3d-active'); });

      function setOrbState(state) {
        orb.classList.remove('listening', 'thinking', 'speaking');
        if (state !== 'idle') orb.classList.add(state);
        if (orb3d) orb3d.setState(state);
      }
      function addBubble(role, content) {
        transcript.insertAdjacentHTML('beforeend', renderChatBubbleHtml({ role, content }));
        transcript.scrollTop = transcript.scrollHeight;
      }

      async function turn(userText) {
        if (userText) { history.push({ role: 'user', content: userText }); addBubble('user', userText); }
        input.value = '';
        input.disabled = true;
        sendBtn.disabled = true;
        setOrbState('thinking');
        voiceStatus.textContent = 'Thinking…';
        transcript.insertAdjacentHTML('beforeend', `<div class="chat-bubble coach" id="intake-loading">${typingDots()}</div>`);
        transcript.scrollTop = transcript.scrollHeight;
        try {
          const res = await fetch('/api/coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'intake', history, message: '' }),
          });
          const data = await res.json();
          document.getElementById('intake-loading')?.remove();
          if (!res.ok) throw new Error(data.error || 'Request failed');
          if (data.escalation) {
            addBubble('coach', data.message);
            setOrbState('idle');
            voiceStatus.textContent = 'Tap to speak, or type below';
            return;
          }
          history.push({ role: 'coach', content: data.message });
          addBubble('coach', data.message);
          if (getSettings().autoSpeak !== false) {
            setOrbState('speaking');
            voiceStatus.textContent = 'Speaking…';
            speakText(data.message, () => { setOrbState('idle'); voiceStatus.textContent = finished ? '' : 'Tap to speak, or type below'; });
          } else {
            setOrbState('idle');
            voiceStatus.textContent = finished ? '' : 'Tap to speak, or type below';
          }
          if (data.extracted) applyExtractedToForm(data.extracted);
          if (data.done) {
            finished = true;
            input.disabled = true;
            sendBtn.disabled = true;
            setTimeout(() => goToForm(3), 1400);
          }
        } catch (err) {
          // A brand-new user's very first interaction with the app is the worst possible place
          // to strand someone on a raw API error (billing lapse, rate limit, outage) — rather
          // than leaving them stuck typing into a broken chat, fail safe straight to the
          // structured form after a moment, so onboarding can always be completed regardless.
          document.getElementById('intake-loading')?.remove();
          addBubble('coach', "I'm having trouble connecting right now, so let's use the quick form instead — nothing you've said is lost, just switching how the rest is collected.");
          setOrbState('idle');
          voiceStatus.textContent = '';
          finished = true;
          input.disabled = true;
          sendBtn.disabled = true;
          console.error('Intake turn failed:', err.message);
          setTimeout(() => goToForm(1), 2200);
        } finally {
          if (!finished) { input.disabled = false; sendBtn.disabled = false; input.focus(); }
        }
      }

      sendBtn.addEventListener('click', () => { if (input.value.trim()) turn(input.value.trim()); });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value.trim()) turn(input.value.trim()); });

      const SR = getSpeechRecognitionCtor();
      let recognition = null;
      let listening = false;
      if (SR) {
        recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = (e) => turn(e.results[0][0].transcript);
        recognition.onerror = () => { listening = false; setOrbState('idle'); voiceStatus.textContent = 'Tap to speak, or type below'; };
        recognition.onend = () => { listening = false; };
      }
      orb.addEventListener('click', () => {
        if (finished) return;
        if (!recognition) { voiceStatus.textContent = "Voice input isn't supported in this browser — type below instead."; return; }
        stopSpeaking();
        if (listening) { recognition.stop(); listening = false; setOrbState('idle'); voiceStatus.textContent = 'Tap to speak, or type below'; return; }
        try { recognition.start(); listening = true; setOrbState('listening'); voiceStatus.textContent = 'Listening…'; }
        catch { voiceStatus.textContent = 'Could not start the microphone — check browser permissions.'; }
      });

      overlay.querySelector('#intake-use-form').addEventListener('click', () => {
        stopSpeaking();
        if (recognition && listening) recognition.stop();
        goToForm(1);
      });

      turn(null); // opening turn — no user message yet, model greets and asks its first question
    }

    overlay.querySelector('#wizard-next').addEventListener('click', () => showStep(Math.min(WIZARD_STEPS.length, step + 1)));
    overlay.querySelector('#wizard-back').addEventListener('click', () => showStep(Math.max(1, step - 1)));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      setProfile(collectProfileFromForm(form));
      const s = getSettings();
      s.coachTone = chosenTone;
      setSettings(s);
      setOnboarded();
      overlay.remove();
      render();
      maybeStartTour();
    });
    overlay.querySelector('#onboarding-skip').addEventListener('click', () => {
      setOnboarded();
      overlay.remove();
      maybeStartTour();
    });
    overlay.querySelector('#wizard-cover-skip').addEventListener('click', () => {
      setOnboarded();
      overlay.remove();
      maybeStartTour();
    });
  }

  // ---------- settings ----------
  function renderSettings() {
    const main = document.getElementById('main');
    const settings = getSettings();
    main.innerHTML = `
      <h1>Settings</h1>
      <p class="subtitle">Local to this browser — nothing here is sent anywhere except the AI behavior options, which only affect what's sent with your next plan request.</p>
      <div class="card">
        <div class="settings-section">
          <div class="settings-row-label">Appearance</div>
          <div class="theme-options" id="theme-options">
            ${['system', 'light', 'dark'].map((t) => `<div class="theme-option ${settings.theme === t ? 'active' : ''}" data-theme-choice="${t}">${t[0].toUpperCase() + t.slice(1)}</div>`).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row-label">Accent theme</div>
          <div class="accent-swatches" id="accent-swatches">
            ${ACCENT_THEMES.map((a) => `<div class="accent-swatch ${settings.accentTheme === a.key ? 'active' : ''}" data-accent-choice="${a.key}" style="background:${a.swatch}" title="${escapeHtml(a.label)}"></div>`).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row-label">Density</div>
          <div class="theme-options" id="density-options">
            ${['comfortable', 'compact'].map((d) => `<div class="theme-option ${settings.density === d ? 'active' : ''}" data-density-choice="${d}">${d[0].toUpperCase() + d.slice(1)}</div>`).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row">
            <div><div class="settings-row-label">Reduced motion</div><div class="settings-row-desc">Turns off confetti, tweened animations, and entrance effects.</div></div>
            <label class="switch"><input type="checkbox" id="reduced-motion-toggle" ${settings.reducedMotion ? 'checked' : ''}/><span class="switch-track"></span></label>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row-label">Units</div>
          <div class="theme-options" id="units-options">
            ${['metric', 'imperial'].map((u) => `<div class="theme-option ${settings.units === u ? 'active' : ''}" data-units-choice="${u}">${u === 'metric' ? 'Metric (kg / cm)' : 'Imperial (lbs / in)'}</div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <h2>AI coaching behavior</h2>
        <div class="settings-section">
          <div class="settings-row-label">Coaching tone</div>
          <div class="tone-options" id="tone-options">
            ${COACH_TONE_OPTIONS.map((t) => `
              <div class="tone-option ${settings.coachTone === t.key ? 'active' : ''}" data-tone-choice="${t.key}">
                <div class="tone-option-title">${escapeHtml(t.title)}</div>
                <div class="tone-option-desc">${escapeHtml(t.desc)}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Allow live web search</div>
              <div class="settings-row-desc">Lets the coach branch beyond the curated library to credible sources (NIH, PubMed, Harvard, major journals) when it makes an answer more specific or current.</div>
            </div>
            <label class="switch"><input type="checkbox" id="web-search-toggle" ${settings.allowWebSearch ? 'checked' : ''}/><span class="switch-track"></span></label>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Always show full plan detail</div>
              <div class="settings-row-desc">Off by default: a plan you've already opened once collapses to a one-line summary on your next visit.</div>
            </div>
            <label class="switch"><input type="checkbox" id="always-expand-toggle" ${settings.alwaysExpandPlans ? 'checked' : ''}/><span class="switch-track"></span></label>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Daily reminder</div>
              <div class="settings-row-desc">A gentle browser notification once a day while this tab is open, if you haven't marked anything done yet. Requires browser notification permission — this is not a push service and won't reach you if the tab is closed.</div>
            </div>
            <label class="switch"><input type="checkbox" id="daily-reminder-toggle" ${settings.dailyReminder ? 'checked' : ''}/><span class="switch-track"></span></label>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <h2>Voice</h2>
        <div class="settings-section">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Coach speaks its replies aloud</div>
              <div class="settings-row-desc">Turn off to keep the Coach text-only.</div>
            </div>
            <label class="switch"><input type="checkbox" id="autospeak-toggle" ${settings.autoSpeak !== false ? 'checked' : ''}/><span class="switch-track"></span></label>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row-label">Voice engine</div>
          <div class="settings-row-desc" style="margin-bottom:10px">Neural sounds natural and human, closer to ChatGPT's voice — routed through the server. Browser voice is free, works offline, and never leaves your device, but sounds more robotic.</div>
          <div class="theme-options" id="voice-engine-options">
            ${[['neural', 'Neural (recommended)'], ['browser', 'Browser']].map(([k, label]) => `<div class="theme-option ${(settings.voiceEngine || 'neural') === k ? 'active' : ''}" data-voice-engine-choice="${k}">${label}</div>`).join('')}
          </div>
        </div>
        <div class="settings-section" id="voice-picker-section" style="${(settings.voiceEngine || 'neural') === 'browser' ? 'opacity:0.4;pointer-events:none' : ''}">
          <div class="settings-row-label">Voice</div>
          <div class="voice-options" id="voice-options">
            ${TTS_VOICE_OPTIONS.map((v) => `
              <div class="voice-option ${(settings.voice || 'nova') === v.key ? 'active' : ''}" data-voice-choice="${v.key}">
                <div>
                  <div class="tone-option-title">${escapeHtml(v.label)}</div>
                  <div class="tone-option-desc">${escapeHtml(v.desc)}</div>
                </div>
                <button type="button" class="btn-text-clear voice-preview-btn" data-voice-preview="${v.key}">${lcIcon('mic', 13)} Preview</button>
              </div>
            `).join('')}
          </div>
          <div class="settings-row-desc" style="margin-top:8px">Needs an OpenAI API key configured on the server — falls back to your browser's voice automatically if one isn't set.</div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="settings-section">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Install as an app</div>
              <div class="settings-row-desc">Add Longevity Compass to your home screen or dock for a standalone, full-screen experience — no browser chrome. On iPhone/iPad, use Share → Add to Home Screen instead; Safari doesn't support an in-page install button.</div>
            </div>
            <button class="btn btn-secondary" id="install-app-btn" ${deferredInstallPrompt ? '' : 'disabled'}>Install</button>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">App tour</div>
              <div class="settings-row-desc">A 30-second spotlight walkthrough of what each tab does.</div>
            </div>
            <button class="btn btn-secondary" id="replay-tour-btn">Replay tour</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <h2>Integrations</h2>
        <p class="subtitle" style="margin-bottom:10px">Real wearable/account integrations need backend infrastructure this local-only MVP doesn't have yet — shown here transparently as the roadmap, not faked.</p>
        <div class="integration-grid">
          ${['Oura Ring', 'Whoop', 'Apple Health', 'Google Fit'].map((name) => `
            <div class="integration-card"><span class="integration-badge">Coming soon</span>${lcIcon('heartpulse', 20)}<div class="integration-card-name">${name}</div></div>
          `).join('')}
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="settings-section">
          <div class="settings-row-label">Backup</div>
          <div class="settings-row-desc" style="margin-bottom:10px">Download everything stored in this browser (profile, genetic markers, topic progress, settings) as a file, or restore from one.</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-secondary" id="export-data-btn">Download my data</button>
            <button class="btn btn-secondary" id="import-data-btn">Restore from file</button>
            <input type="file" accept="application/json" id="import-file-input" style="display:none"/>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row-label">Reset</div>
          <div class="settings-row-desc" style="margin-bottom:10px">Clears your profile, genetic markers, and all topic progress from this browser. Cannot be undone.</div>
          <button class="btn btn-danger" id="reset-data-btn">Reset all local data</button>
        </div>
      </div>
    `;

    main.querySelectorAll('[data-theme-choice]').forEach((el) => {
      el.addEventListener('click', () => {
        const s = getSettings();
        s.theme = el.dataset.themeChoice;
        setSettings(s);
        applyAppearance();
        renderSettings();
      });
    });
    main.querySelectorAll('[data-accent-choice]').forEach((el) => {
      el.addEventListener('click', () => {
        const s = getSettings();
        s.accentTheme = el.dataset.accentChoice;
        setSettings(s);
        applyAppearance();
        renderSettings();
      });
    });
    main.querySelectorAll('[data-density-choice]').forEach((el) => {
      el.addEventListener('click', () => {
        const s = getSettings();
        s.density = el.dataset.densityChoice;
        setSettings(s);
        applyAppearance();
        renderSettings();
      });
    });
    main.querySelector('#reduced-motion-toggle').addEventListener('change', (e) => {
      const s = getSettings();
      s.reducedMotion = e.target.checked;
      setSettings(s);
      applyAppearance();
    });
    main.querySelectorAll('[data-units-choice]').forEach((el) => {
      el.addEventListener('click', () => {
        const s = getSettings();
        s.units = el.dataset.unitsChoice;
        setSettings(s);
        renderSettings();
      });
    });
    main.querySelectorAll('#tone-options [data-tone-choice]').forEach((el) => {
      el.addEventListener('click', () => {
        const s = getSettings();
        s.coachTone = el.dataset.toneChoice;
        setSettings(s);
        renderSettings();
      });
    });
    main.querySelector('#web-search-toggle').addEventListener('change', (e) => {
      const s = getSettings();
      s.allowWebSearch = e.target.checked;
      setSettings(s);
    });
    main.querySelector('#always-expand-toggle').addEventListener('change', (e) => {
      const s = getSettings();
      s.alwaysExpandPlans = e.target.checked;
      setSettings(s);
    });
    main.querySelector('#daily-reminder-toggle').addEventListener('change', async (e) => {
      const s = getSettings();
      if (e.target.checked && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { e.target.checked = false; return; }
      }
      s.dailyReminder = e.target.checked;
      setSettings(s);
    });
    main.querySelector('#autospeak-toggle').addEventListener('change', (e) => {
      const s = getSettings();
      s.autoSpeak = e.target.checked;
      setSettings(s);
    });
    main.querySelectorAll('[data-voice-engine-choice]').forEach((el) => {
      el.addEventListener('click', () => {
        const s = getSettings();
        s.voiceEngine = el.dataset.voiceEngineChoice;
        setSettings(s);
        renderSettings();
      });
    });
    main.querySelectorAll('[data-voice-choice]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-voice-preview]')) return;
        const s = getSettings();
        s.voice = el.dataset.voiceChoice;
        setSettings(s);
        renderSettings();
      });
    });
    main.querySelectorAll('[data-voice-preview]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        previewVoice(el.dataset.voicePreview);
      });
    });
    main.querySelector('#install-app-btn').addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      renderSettings();
    });
    main.querySelector('#replay-tour-btn').addEventListener('click', () => {
      navigate('/today');
      setTimeout(() => startAppTour(), 200);
    });
    main.querySelector('#export-data-btn').addEventListener('click', () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        profile: getProfile(),
        topics: getAllTopicState(),
        settings: getSettings(),
        journal: getJournal(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'longevity-compass-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    const importInput = main.querySelector('#import-file-input');
    main.querySelector('#import-data-btn').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      const file = importInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.profile) setProfile(data.profile);
          if (data.topics) localStorage.setItem(STORAGE.topics, JSON.stringify(data.topics));
          if (data.settings) setSettings(data.settings);
          if (data.journal) localStorage.setItem(STORAGE.journal, JSON.stringify(data.journal));
          setOnboarded();
          alert('Data restored.');
          applyAppearance();
          render();
        } catch {
          alert('That file could not be read as a Longevity Compass backup.');
        }
      };
      reader.readAsText(file);
    });
    main.querySelector('#reset-data-btn').addEventListener('click', () => {
      if (!confirm('Reset all local data? This clears everything on this device — profile, genetic markers, topic progress and plans, meal log, chat history, journal, and settings.')) return;
      // Every key this app ever writes is under STORAGE (fixed keys, no per-topic dynamic
      // names) — remove them all, plus a defensive sweep for any stray "lc_"-prefixed key from
      // an older version, so "reset" really does mean everything, not "most things."
      Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
      Object.keys(localStorage).filter((k) => k.startsWith('lc_')).forEach((k) => localStorage.removeItem(k));
      location.hash = '#/today';
      location.reload();
    });
  }

  // ---------- daily reminder (honest scope: local-tab-only, not a real push service) ----------
  function maybeFireDailyReminder() {
    const settings = getSettings();
    if (!settings.dailyReminder || !('Notification' in window) || Notification.permission !== 'granted') return;
    const todayKey = new Date().toDateString();
    if (localStorage.getItem(STORAGE.reminderFired) === todayKey) return;
    const anyDoneToday = TOPICS.some((t) => getTopicState(t.id).days.some(Boolean));
    if (anyDoneToday) return;
    if (new Date().getHours() < 17) return;
    new Notification('Longevity Compass', { body: "You haven't marked anything done today — even one small action keeps your streak of real progress going." });
    localStorage.setItem(STORAGE.reminderFired, todayKey);
  }

  // ---------- topic ----------
  function renderTopic(topicId) {
    const topic = TOPICS.find((t) => t.id === topicId);
    const main = document.getElementById('main');
    if (!topic) { main.innerHTML = '<div class="empty-state">Unknown topic.</div>'; return; }

    const state = getTopicState(topicId);
    const score = scoreForTopic(topicId);

    const accent = topicAccent(topic.id);
    main.innerHTML = `
      <div class="topic-header">
        <div class="topic-title-row">
          <span class="icon-badge" style="color:${accent};background:${accent}22">${lcIcon(topic.icon, 20)}</span>
          <div>
            <h1 style="margin-bottom:2px">${topic.label}</h1>
            <p class="subtitle" style="margin-bottom:0">${score}% adherence this week</p>
          </div>
        </div>
        <button class="btn btn-secondary" id="regenerate-btn">${state.lastResult ? 'Regenerate plan' : 'Get today’s plan'}</button>
      </div>
      ${topic.description ? `<p class="topic-intro" style="--dbx-accent:${accent}">${escapeHtml(topic.description)}</p>` : ''}
      ${topic.knownLimitation ? `<div class="limitation-note">${escapeHtml(topic.knownLimitation)}</div>` : ''}
      <div class="card time-ask-card">
        <div class="time-ask-label">How much time do you realistically have today? This resizes the action — not just decoration.</div>
        <div class="time-chip-row" id="time-chip-row"></div>
      </div>
      <div id="plan-area"></div>
      <div class="tracker-card card">
        <div class="tracker-card-label">This week's progress</div>
        <div class="tracker-row" id="tracker-row"></div>
      </div>
    `;

    renderTimeChips(topicId, state);
    renderTracker(topicId, state);
    renderPlanArea(topicId, state);

    document.getElementById('regenerate-btn').addEventListener('click', () => requestPlan(topicId));
  }

  function renderTimeChips(topicId, state) {
    const row = document.getElementById('time-chip-row');
    row.innerHTML = TIME_BUDGET_OPTIONS.map((o) => `<div class="time-chip ${state.timeBudget === o.key ? 'active' : ''}" data-time-choice="${o.key}">${o.label}</div>`).join('');
    row.querySelectorAll('.time-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const s = getTopicState(topicId);
        s.timeBudget = s.timeBudget === chip.dataset.timeChoice ? null : chip.dataset.timeChoice;
        setTopicState(topicId, s);
        renderTimeChips(topicId, s);
      });
    });
  }

  function renderTracker(topicId, state) {
    const row = document.getElementById('tracker-row');
    row.innerHTML = state.days.map((done, i) => `<div class="tracker-dot ${done ? 'done' : ''}" data-i="${i}">${done ? lcIcon('check', 14) : i + 1}</div>`).join('');
    row.querySelectorAll('.tracker-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const i = Number(dot.dataset.i);
        const s = getTopicState(topicId);
        const wasDone = s.days[i];
        s.days[i] = !wasDone;
        setTopicState(topicId, s);
        if (!wasDone) celebrateCompletion(dot, topicId, s);
        onTrackerChanged(topicId, s);
      });
    });
  }

  // Single source of truth for "a day just got marked done": bursts confetti at the
  // triggering element, and celebrates louder if the whole week just completed.
  function celebrateCompletion(triggerEl, topicId, state) {
    burstConfetti(triggerEl);
    const topic = TOPICS.find((t) => t.id === topicId);
    addJournalEntry({ type: 'done', topicId, text: `Completed today's action for ${topic ? topic.label : 'a topic'}` });
    const allDone = state.days.every(Boolean);
    if (allDone) {
      addJournalEntry({ type: 'week', topicId, text: `Completed a full week of ${topic ? topic.label : 'this topic'}` });
      showToast(`${lcIcon('check', 16)} Full week on ${escapeHtml(topic ? topic.label : 'this topic')}!`, { celebrate: true });
      burstConfetti(triggerEl, { count: 40 });
    }
  }

  function onTrackerChanged(topicId, state) {
    renderRail(currentRoute());
    renderTracker(topicId, state);
    const scoreEl = document.querySelector('.topic-header .subtitle');
    if (scoreEl) scoreEl.textContent = `${scoreForTopic(topicId)}% adherence this week`;
    const markBtn = document.getElementById('mark-done-btn');
    if (markBtn) updateMarkDoneButton(markBtn, state);
  }

  function updateMarkDoneButton(btn, state) {
    const nextIdx = state.days.findIndex((d) => !d);
    if (nextIdx === -1) {
      btn.innerHTML = `${lcIcon('check', 15)} This week complete`;
      btn.disabled = true;
    } else {
      btn.innerHTML = `${lcIcon('bolt', 15)} Mark day ${nextIdx + 1} done`;
      btn.disabled = false;
    }
  }

  function renderPlanArea(topicId, state) {
    const area = document.getElementById('plan-area');
    const topic = TOPICS.find((t) => t.id === topicId);

    if (!state.lastResult) {
      area.innerHTML = `
        <div class="card empty-state">
          <span class="empty-icon">${lcIcon(topic ? topic.icon : 'leaf', 22)}</span>
          <div class="empty-title">No plan yet for ${topic ? escapeHtml(topic.label) : 'this topic'}</div>
          <div class="empty-desc">Click "Get today's plan" above — it's grounded in your profile and this topic's research library, not a generic tip.</div>
        </div>
      `;
      return;
    }

    const result = state.lastResult;

    if (result.escalation) {
      area.innerHTML = `<div class="escalation-card"><strong>This is outside wellness coaching.</strong><br/>${escapeHtml(result.message)}</div>`;
      return;
    }

    const alwaysExpand = getSettings().alwaysExpandPlans;
    if (!state.hasViewedFull || alwaysExpand) {
      area.innerHTML = buildFullCard(result, topic);
      state.hasViewedFull = true;
      setTopicState(topicId, state);
      wirePlanCard(topicId);
    } else {
      area.innerHTML = `
        <div class="card collapsed-summary" id="collapsed-toggle">
          <span class="summary-text"><strong>${escapeHtml(result.headline || 'Today’s action')}</strong> — ${escapeHtml(result.doThis || '—')}</span>
          <span class="chevron">${lcIcon('chevron', 16)}</span>
        </div>
      `;
      document.getElementById('collapsed-toggle').addEventListener('click', () => {
        area.innerHTML = buildFullCard(result, topic);
        wirePlanCard(topicId);
      }, { once: true });
    }
  }

  function wirePlanCard(topicId) {
    const btn = document.getElementById('mark-done-btn');
    if (btn) {
      updateMarkDoneButton(btn, getTopicState(topicId));
      btn.addEventListener('click', () => {
        const s = markNextDayDone(topicId, btn);
        if (s) onTrackerChanged(topicId, s);
      });
    }
    const sessionBtn = document.getElementById('start-session-btn');
    if (sessionBtn) {
      sessionBtn.addEventListener('click', () => {
        const state = getTopicState(topicId);
        const steps = state.lastResult && Array.isArray(state.lastResult.steps) ? state.lastResult.steps : [];
        if (steps.length) startGuidedSession(steps, topicId);
      });
    }
    wireChatPanel(topicId);
  }

  // ---------- guided paced session player (Google-inspired) ----------
  function startGuidedSession(steps, topicId) {
    let idx = 0;
    let remaining = steps[0].seconds;
    let paused = false;
    let timer = null;
    const RING_R = 96;
    const CIRC = 2 * Math.PI * RING_R;

    const overlay = document.createElement('div');
    overlay.className = 'session-overlay';
    overlay.innerHTML = `
      <button type="button" class="session-close" id="session-close">${lcIcon('close', 22)}</button>
      <div class="session-step-count" id="session-step-count"></div>
      <div class="session-ring-wrap">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r="${RING_R}" fill="none" stroke="var(--gridline)" stroke-width="8"/>
          <circle id="session-ring" cx="110" cy="110" r="${RING_R}" fill="none" stroke="var(--accent)" stroke-width="8"
            stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="0" transform="rotate(-90 110 110)"/>
        </svg>
        <div class="session-ring-num" id="session-ring-num"></div>
      </div>
      <div class="session-step-label" id="session-step-label"></div>
      <div class="session-controls">
        <button class="btn btn-secondary" id="session-pause">Pause</button>
        <button class="btn btn-secondary" id="session-skip">Skip</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const ring = overlay.querySelector('#session-ring');
    const ringNum = overlay.querySelector('#session-ring-num');
    const stepLabel = overlay.querySelector('#session-step-label');
    const stepCount = overlay.querySelector('#session-step-count');
    const pauseBtn = overlay.querySelector('#session-pause');

    function renderStep() {
      stepCount.textContent = `Step ${idx + 1} of ${steps.length}`;
      stepLabel.textContent = steps[idx].label;
      speakText(steps[idx].label);
    }

    function tick() {
      if (paused) return;
      remaining -= 1;
      const frac = Math.max(0, remaining / steps[idx].seconds);
      ring.setAttribute('stroke-dashoffset', String(CIRC * (1 - frac)));
      ringNum.textContent = String(Math.max(0, remaining));
      if (remaining <= 0) {
        idx += 1;
        if (idx >= steps.length) { finish(); return; }
        remaining = steps[idx].seconds;
        renderStep();
      }
    }

    function finish() {
      clearInterval(timer);
      stopSpeaking();
      overlay.remove();
      const s = markNextDayDone(topicId, document.body);
      if (s) { onTrackerChanged(topicId, s); showToast(`${lcIcon('check', 16)} Guided session complete!`, { celebrate: true }); }
    }

    overlay.querySelector('#session-close').addEventListener('click', () => {
      clearInterval(timer);
      stopSpeaking();
      overlay.remove();
    });
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    });
    overlay.querySelector('#session-skip').addEventListener('click', () => {
      idx += 1;
      if (idx >= steps.length) { finish(); return; }
      remaining = steps[idx].seconds;
      renderStep();
    });

    renderStep();
    ringNum.textContent = String(remaining);
    timer = setInterval(tick, 1000);
  }

  const STRENGTH_LABEL = { strong: 'Strong evidence', moderate: 'Moderate evidence', preliminary: 'Preliminary' };

  function buildFullCard(result, topic) {
    const evidence = (result.evidence && result.evidence.length)
      ? result.evidence
      : deriveEvidenceChips(result.why);
    const evidenceHtml = evidence.map((e) => `
      <div class="evidence-card ${e.type === 'limitation' ? 'limitation' : ''}">
        <span class="evidence-card-icon">${lcIcon(e.type === 'limitation' ? 'chevron' : 'check', 14)}</span>
        <span>
          ${escapeHtml(e.text)}
          ${e.strength ? `<span class="evidence-strength strength-${e.strength}">${escapeHtml(STRENGTH_LABEL[e.strength] || e.strength)}</span>` : ''}
          ${e.sourceQuote ? `<div class="source-quote">“${escapeHtml(e.sourceQuote)}”</div>` : ''}
        </span>
      </div>
    `).join('');
    const headline = result.headline || deriveHeadline(result.doThis);
    const accent = topic ? topicAccent(topic.id) : null;
    const accentStyle = accent ? ` style="--dbx-accent:${accent}"` : '';

    const eat = result.eat || [];
    const avoid = result.avoid || [];
    const foodCol = (items, kind) => items.length ? `
      <div class="food-guide-col food-guide-${kind}">
        <div class="food-guide-col-label">${lcIcon(kind === 'eat' ? 'check' : 'close', 12)} ${kind === 'eat' ? 'Eat' : 'Limit'}</div>
        ${items.map((item) => `
          <div class="food-item">
            <span class="food-item-name">${escapeHtml(item.food)}</span>
            ${item.detail ? `<span class="food-item-detail">${escapeHtml(item.detail)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    ` : '';
    const foodGuideHtml = (eat.length || avoid.length) ? `
      <div class="plan-section-label">Food guide</div>
      <div class="food-guide-grid">${foodCol(eat, 'eat')}${foodCol(avoid, 'avoid')}</div>
    ` : '';

    const sources = Array.isArray(result.sources) ? result.sources : [];
    const citationsHtml = sources.length ? `
      <div class="source-citation-list">
        ${sources.map((s) => `<div class="source-citation"><span class="source-citation-domain">${escapeHtml(s.domain || '')}</span><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title || s.url)}</a></div>`).join('')}
      </div>
    ` : '';

    return `
      <div class="card plan-card">
        ${result.mock ? '<span class="mock-badge">Mock response — set API keys for a real, grounded plan</span>' : ''}
        <div class="plan-card-grid">
          <div class="plan-hero glass"${accentStyle}>
            <div class="plan-hero-icon">${lcIcon(topic ? topic.icon : 'leaf', 26)}</div>
            <div class="plan-hero-label">Today's deliverable</div>
            <h3 class="plan-hero-headline">${escapeHtml(headline)}</h3>
            ${result.doThis ? `<p class="plan-hero-sub">${escapeHtml(result.doThis)}</p>` : ''}
            ${result.personalizationNote ? `<div class="plan-reflection">${lcIcon('hands', 13)} ${escapeHtml(result.personalizationNote)}</div>` : ''}
            <div class="plan-hero-actions">
              <button class="btn btn-primary" id="mark-done-btn"></button>
              ${Array.isArray(result.steps) && result.steps.length ? `<button class="btn btn-secondary" id="start-session-btn">${lcIcon('bolt', 14)} Start guided session (${result.steps.length} steps)</button>` : ''}
            </div>
          </div>
          <div class="plan-body">
            ${result.why ? `
              <div class="plan-body-section">
                <div class="plan-section-label">Why it matters</div>
                <div class="plan-why">${escapeHtml(result.why)}</div>
                ${evidenceHtml ? `<div class="evidence-card-list">${evidenceHtml}</div>` : ''}
              </div>
            ` : ''}
            ${foodGuideHtml ? `<div class="plan-body-section">${foodGuideHtml}</div>` : ''}
            ${result.watchFor ? `
              <div class="plan-watchfor-card">
                <span class="plan-watchfor-icon">${lcIcon('chevron', 14)}</span>
                <div><div class="plan-section-label" style="margin:0 0 3px">Heads up</div>${escapeHtml(result.watchFor)}</div>
              </div>
            ` : ''}
            <div class="plan-sources-footer">
              ${lcIcon('dna', 13)} ${topic && topic.sourceLabel ? escapeHtml(topic.sourceLabel) : 'Curated research library'}
              ${result.usedWebSearch ? `<span class="web-search-badge">${lcIcon('atom', 11)} Includes live web search</span>` : ''}
              ${citationsHtml}
            </div>
            ${buildChatPanelHtml(topic)}
          </div>
        </div>
      </div>
    `;
  }

  // Fallback headline for mock mode / naive-parse fallback, when Stage 2 didn't supply one:
  // first ~6 words of the action, title-cased into something card-sized and memorable.
  function deriveHeadline(doThis) {
    if (!doThis) return 'Today’s action';
    const words = doThis.replace(/^\[MOCK[^\]]*\]\s*/, '').split(/\s+/).slice(0, 6).join(' ');
    return words.replace(/[.,;:]$/, '');
  }

  // Fallback client-side chip splitter, used only if the server's evidence array is empty
  // (e.g. the naive fallback parser ran because Stage 2 failed).
  function deriveEvidenceChips(why) {
    if (!why) return [];
    const sentences = why.split(/(?<=[.!?])\s+/);
    return sentences
      .filter((s) => s.trim())
      .map((s) => {
        const isLimitation = /does not (show|prove|establish)/i.test(s);
        const hasNumber = /\d/.test(s);
        if (isLimitation) return { text: s.trim(), type: 'limitation' };
        if (hasNumber) return { text: s.trim(), type: 'figure' };
        return null;
      })
      .filter(Boolean);
  }

  function buildChatPanelHtml(topic) {
    const topicId = topic ? topic.id : null;
    const history = topicId ? getChatHistory(topicId) : [];
    return `
      <div class="chat-panel" data-topic="${topicId || ''}">
        <button type="button" class="chat-toggle" id="chat-toggle">${lcIcon('chevron', 14)} Ask a follow-up question</button>
        <div id="chat-body" style="display:none">
          <div class="chat-messages" id="chat-messages">${history.map((m) => renderChatBubbleHtml(m)).join('')}</div>
          <div class="chat-input-row">
            <input type="text" class="chat-input" id="chat-input" placeholder="e.g. does this still apply if I'm vegetarian?" maxlength="300"/>
            <button type="button" class="btn btn-primary" id="chat-send">Send</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderChatBubbleHtml(m) {
    return `<div class="chat-bubble ${m.role === 'user' ? 'user' : 'coach'}">${escapeHtml(m.content)}</div>`;
  }

  function wireChatPanel(topicId) {
    const toggle = document.getElementById('chat-toggle');
    if (!toggle) return;
    const body = document.getElementById('chat-body');
    toggle.addEventListener('click', () => {
      const showing = body.style.display !== 'none';
      body.style.display = showing ? 'none' : '';
      if (!showing) {
        const messages = document.getElementById('chat-messages');
        messages.scrollTop = messages.scrollHeight;
      }
    });

    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const messagesEl = document.getElementById('chat-messages');

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      const state = getTopicState(topicId);
      const history = getChatHistory(topicId);
      history.push({ role: 'user', content: text });
      setChatHistory(topicId, history);
      messagesEl.insertAdjacentHTML('beforeend', renderChatBubbleHtml({ role: 'user', content: text }));
      messagesEl.scrollTop = messagesEl.scrollHeight;
      input.value = '';
      input.disabled = true;
      sendBtn.disabled = true;

      const loadingHtml = `<div class="chat-bubble coach" id="chat-loading">${typingDots()}</div>`;
      messagesEl.insertAdjacentHTML('beforeend', loadingHtml);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      try {
        const settings = getSettings();
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'followup',
            topicId,
            profile: getProfile(),
            context: { coachTone: settings.coachTone, allowWebSearch: settings.allowWebSearch },
            planContext: state.lastResult ? { headline: state.lastResult.headline, doThis: state.lastResult.doThis, why: state.lastResult.why } : null,
            history: history.slice(0, -1),
            message: text,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        const reply = data.escalation ? data.message : data.reply;
        const updated = getChatHistory(topicId);
        updated.push({ role: 'coach', content: reply });
        setChatHistory(topicId, updated);
        document.getElementById('chat-loading')?.remove();
        messagesEl.insertAdjacentHTML('beforeend', renderChatBubbleHtml({ role: 'coach', content: reply }));
      } catch (err) {
        document.getElementById('chat-loading')?.remove();
        messagesEl.insertAdjacentHTML('beforeend', renderChatBubbleHtml({ role: 'coach', content: `Something went wrong: ${err.message}` }));
      } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  async function requestPlan(topicId) {
    const btn = document.getElementById('regenerate-btn');
    const area = document.getElementById('plan-area');
    btn.disabled = true;
    area.innerHTML = `
      <div class="card">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;display:flex;align-items:center;gap:8px">${typingDots()} Grounding in your research library, then formatting the plan…</div>
        <div class="plan-card-grid">
          <div class="plan-hero-skeleton">
            <div class="skeleton-line" style="width:48px;height:48px;border-radius:14px;margin-bottom:16px"></div>
            <div class="skeleton-line" style="width:60%;height:11px"></div>
            <div class="skeleton-line" style="width:92%;height:19px;margin-top:8px"></div>
            <div class="skeleton-line" style="width:75%;height:19px"></div>
            <div class="skeleton-line" style="width:100%;height:38px;border-radius:10px;margin-top:18px"></div>
          </div>
          <div>
            <div class="skeleton-line" style="width:30%"></div>
            <div class="skeleton-line" style="width:95%"></div>
            <div class="skeleton-line" style="width:88%"></div>
            <div class="skeleton-line" style="width:70%"></div>
          </div>
        </div>
      </div>
    `;
    try {
      const priorState = getTopicState(topicId);
      const settings = getSettings();
      const context = {
        adherencePct: scoreForTopic(topicId),
        recentActions: (priorState.history || []).slice(-HISTORY_MAX),
        timeBudget: priorState.timeBudget || null,
        coachTone: settings.coachTone,
        allowWebSearch: settings.allowWebSearch,
      };
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, profile: getProfile(), context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      const isMock = (data.raw || '').includes('[MOCK') || (data.why || '').includes('mock');
      const state = getTopicState(topicId);
      state.lastResult = { ...data, mock: isMock };
      if (!data.escalation) {
        state.hasViewedFull = false; // show full detail again for a fresh plan
        const topic = TOPICS.find((t) => t.id === topicId);
        const history = (state.history || []).concat(data.doThis ? [data.doThis] : []).slice(-HISTORY_MAX);
        state.history = history;
        addJournalEntry({ type: 'plan', topicId, text: `Generated a plan for ${topic ? topic.label : topicId}: ${data.headline || deriveHeadline(data.doThis)}` });
      }
      setTopicState(topicId, state);
      renderPlanArea(topicId, state);
    } catch (err) {
      area.innerHTML = `<div class="empty-state">Something went wrong: ${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Regenerate plan';
    }
  }

  // ---------- today (unified home) ----------
  function renderToday() {
    const main = document.getElementById('main');
    const scores = TOPICS.map((t) => scoreForTopic(t.id));
    const candidates = TOPICS.map((t, i) => ({ t, score: scores[i], state: getTopicState(t.id) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const recent = getJournal().slice(0, 5);
    const synthesis = getSynthesis();
    const todaysMealList = todaysMeals();
    const todaysMealCount = todaysMealList.length;
    const todaysCalories = todaysMealList.reduce((sum, m) => sum + (m.totalCaloriesEstimate || 0), 0);

    main.innerHTML = `
      <div class="today-hero">
        <div class="today-date">${dateStr}</div>
        <h1 class="today-greeting">${greeting()}</h1>
        <div id="daily-briefing-slot"></div>
        <p class="today-sub">Here${candidates.length > 1 ? "'re" : "'s"} your ${candidates.length > 1 ? 'lowest-adherence topics' : 'topic that needs the most attention'} right now.</p>
        <div class="today-actions-list" id="today-actions-list"></div>
      </div>

      <div class="card synthesis-card" id="synthesis-card">
        <div class="synthesis-header">
          <span class="synthesis-badge">${lcIcon('bolt', 13)} AI Weekly Synthesis</span>
          <button class="btn btn-secondary" id="synthesis-btn">${synthesis ? 'Regenerate' : "Generate this week's insight"}</button>
        </div>
        <div id="synthesis-body-wrap">
          ${synthesis ? `<div class="synthesis-body">${escapeHtml(synthesis.synthesis)}</div><div class="synthesis-meta">Generated ${new Date(synthesis.generatedAt).toLocaleString()}</div>` : `<p class="subtitle" style="margin:12px 0 0">A cross-topic AI analysis of your week — what's working, how two of your topics connect, and what to focus on next. Generated on demand, not on every visit.</p>`}
        </div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div>
            <h2 style="margin-bottom:2px">${lcIcon('meal', 17)} Nutrition today</h2>
            <p class="subtitle" style="margin-bottom:0">${todaysMealCount ? `${todaysMealCount} meal${todaysMealCount === 1 ? '' : 's'} logged, ~${Math.round(todaysCalories)} kcal so far.` : 'No meals logged yet today.'}</p>
          </div>
          <a href="#/nutrition" class="btn btn-primary">${lcIcon('meal', 14)} Log a meal</a>
        </div>
      </div>

      <div class="today-grid">
        <div class="card">
          <h2>Recent activity</h2>
          <p class="subtitle" style="margin-bottom:0">Your latest entries — see the full <a href="#/journal">Journal</a>.</p>
          <div class="journal-feed" id="today-recent-feed" style="margin-top:14px"></div>
        </div>
        <div class="card today-mini-radar-card">
          <div id="today-mini-radar" class="radar-chart-host" style="max-width:240px"></div>
        </div>
      </div>
    `;

    renderTodayActions(candidates);
    loadDailyBriefing(scores);
    renderRadar(document.getElementById('today-mini-radar'), TOPICS, scores, { size: 240, padding: 30, labels: false, readout: false, quiet: true });
    document.querySelectorAll('#today-mini-radar .radar-point').forEach((el) => {
      el.addEventListener('click', () => navigate(`/topic/${el.dataset.topic}`));
    });

    const recentFeed = document.getElementById('today-recent-feed');
    recentFeed.innerHTML = recent.length
      ? recent.map((e) => renderJournalEntryHtml(e)).join('')
      : `<div class="journal-empty" style="padding:20px">Nothing logged yet — generate a plan or mark a day done.</div>`;

    document.getElementById('synthesis-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const wrap = document.getElementById('synthesis-body-wrap');
      wrap.innerHTML = `<div style="margin-top:12px;display:flex;align-items:center;gap:8px">${typingDots()} <span style="font-size:13px;color:var(--text-muted)">Analyzing this week across all topics…</span></div>`;
      try {
        const settings = getSettings();
        const topicsSummary = TOPICS.map((t, i) => ({ id: t.id, label: t.label, score: scores[i] }));
        const journalLines = getJournal().slice(0, 15).map((j) => `- ${j.text}`).join('\n');
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'synthesis',
            profile: getProfile(),
            topicsSummary,
            journalSummary: journalLines,
            context: { coachTone: settings.coachTone, allowWebSearch: settings.allowWebSearch },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        if (data.escalation) {
          wrap.innerHTML = `<div class="escalation-card" style="margin-top:12px">${escapeHtml(data.message)}</div>`;
          return;
        }
        const result = { synthesis: data.synthesis, generatedAt: data.generatedAt };
        setSynthesis(result);
        wrap.innerHTML = `<div class="synthesis-body">${escapeHtml(result.synthesis)}</div><div class="synthesis-meta">Generated ${new Date(result.generatedAt).toLocaleString()}</div>`;
        btn.textContent = 'Regenerate';
      } catch (err) {
        wrap.innerHTML = `<div class="empty-state" style="margin-top:12px">Something went wrong: ${escapeHtml(err.message)}</div>`;
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------- Nutrition / Meal Log (dedicated page — its own nav item, not a buried card) ----------
  function renderNutritionLog() {
    const main = document.getElementById('main');
    main.innerHTML = `
      <h1>${lcIcon('meal', 22)} Nutrition Log</h1>
      <p class="subtitle">Snap or upload a meal photo — the coach estimates calories and macros, and gives one suggestion tied to a real mechanism, never generic advice.</p>
      <div class="nutrition-summary-row" id="nutrition-summary-row"></div>
      <div class="card meal-log-card" id="meal-log-card">
        <h2>Log a meal</h2>
        <div class="meal-upload-row">
          <button type="button" class="meal-upload-btn" id="meal-upload-btn" aria-label="Upload a meal photo">${lcIcon('meal', 22)}</button>
          <input type="file" accept="image/*" capture="environment" id="meal-file-input" style="display:none"/>
          <span style="font-size:12.5px;color:var(--text-muted)">JPG or PNG, analyzed on our server — never stored server-side. Your history below lives only in this browser.</span>
        </div>
        <div id="meal-result"></div>
      </div>
      <div class="card" style="margin-top:18px">
        <h2>History</h2>
        <div id="meal-history-list"></div>
      </div>
    `;
    wireMealLogCard();
    renderNutritionSummary();
    renderMealHistory();
  }

  function renderNutritionSummary() {
    const el = document.getElementById('nutrition-summary-row');
    if (!el) return;
    const meals = todaysMeals();
    const kcal = meals.reduce((s, m) => s + (m.totalCaloriesEstimate || 0), 0);
    const protein = meals.reduce((s, m) => s + (m.proteinG || 0), 0);
    const carbs = meals.reduce((s, m) => s + (m.carbsG || 0), 0);
    const fat = meals.reduce((s, m) => s + (m.fatG || 0), 0);
    const tiles = [
      ['kcal today', Math.round(kcal)],
      ['protein', Math.round(protein) + 'g'],
      ['carbs', Math.round(carbs) + 'g'],
      ['fat', Math.round(fat) + 'g'],
    ];
    el.innerHTML = tiles.map(([label, val]) => `
      <div class="nutrition-summary-tile"><div class="nutrition-summary-val">${val}</div><div class="nutrition-summary-label">${escapeHtml(label)}</div></div>
    `).join('');
  }

  function renderMealHistory() {
    const el = document.getElementById('meal-history-list');
    if (!el) return;
    const meals = getMeals();
    if (!meals.length) {
      el.innerHTML = `<div class="journal-empty" style="padding:30px 10px">No meals logged yet — analyze a photo above and tap "Log this meal."</div>`;
      return;
    }
    el.innerHTML = meals.slice(0, 40).map((m) => {
      const foodNames = (m.foods || []).map((f) => f.name).join(', ') || 'Meal';
      const time = new Date(m.ts).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
      return `
        <div class="meal-history-item">
          ${m.thumbnail ? `<img src="${m.thumbnail}" class="meal-history-thumb" alt=""/>` : `<span class="meal-history-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted)">${lcIcon('meal', 18)}</span>`}
          <div class="meal-history-body">
            <div class="meal-history-foods">${escapeHtml(foodNames)}</div>
            <div class="meal-history-meta">${time}${m.confidence ? ' · ' + m.confidence + ' confidence' : ''}</div>
          </div>
          <div class="meal-history-kcal">${m.totalCaloriesEstimate != null ? Math.round(m.totalCaloriesEstimate) + ' kcal' : '—'}</div>
        </div>
      `;
    }).join('');
  }

  // ---------- meal photo logging (Thrive-inspired) ----------
  function wireMealLogCard() {
    const uploadBtn = document.getElementById('meal-upload-btn');
    const fileInput = document.getElementById('meal-file-input');
    const resultEl = document.getElementById('meal-result');
    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result;
        resultEl.innerHTML = `
          <div class="meal-result">
            <div style="display:flex;align-items:center;gap:12px">
              <img src="${dataUrl}" class="meal-preview-thumb" alt="Uploaded meal photo"/>
              <span style="font-size:13px;color:var(--text-muted);display:inline-flex;align-items:center;gap:8px">${typingDots()} Analyzing your photo…</span>
            </div>
          </div>
        `;
        try {
          const settings = getSettings();
          const res = await fetch('/api/coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'mealPhoto', imageBase64: dataUrl, profile: getProfile(), context: { allowWebSearch: settings.allowWebSearch } }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Request failed');
          renderMealResult(data, dataUrl);
        } catch (err) {
          resultEl.innerHTML = `<div class="empty-state" style="margin-top:12px">Something went wrong: ${escapeHtml(err.message)}</div>`;
        }
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });
  }

  function renderMealResult(data, dataUrl) {
    const resultEl = document.getElementById('meal-result');
    const foods = data.foods || [];
    resultEl.innerHTML = `
      <div class="meal-result">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <img src="${dataUrl}" class="meal-preview-thumb" alt="Uploaded meal photo"/>
          <div style="flex:1">
            <span class="meal-confidence">${data.confidence === 'moderate' ? 'Moderate confidence' : 'Low confidence'} estimate</span>
            <div class="meal-calories-hero">${data.totalCaloriesEstimate != null ? Math.round(data.totalCaloriesEstimate) + ' kcal' : '— kcal'}</div>
          </div>
        </div>
        <div class="meal-food-list">
          ${foods.map((f) => `<div class="meal-food-row"><span>${escapeHtml(f.name)}</span><span class="meal-food-detail">${f.estimatedGrams != null ? Math.round(f.estimatedGrams) + 'g' : ''}${f.estimatedCalories != null ? ' · ' + Math.round(f.estimatedCalories) + ' kcal' : ''}</span></div>`).join('')}
        </div>
        <div class="macro-row">
          <div class="macro-tile"><div class="macro-tile-val">${data.proteinG != null ? Math.round(data.proteinG) + 'g' : '—'}</div><div class="macro-tile-label">Protein</div></div>
          <div class="macro-tile"><div class="macro-tile-val">${data.carbsG != null ? Math.round(data.carbsG) + 'g' : '—'}</div><div class="macro-tile-label">Carbs</div></div>
          <div class="macro-tile"><div class="macro-tile-val">${data.fatG != null ? Math.round(data.fatG) + 'g' : '—'}</div><div class="macro-tile-label">Fat</div></div>
        </div>
        ${data.suggestion ? `<div class="meal-suggestion">${lcIcon('check', 13)} ${escapeHtml(data.suggestion)}</div>` : ''}
        <button class="btn btn-primary" id="log-meal-btn" style="margin-top:14px">Log this meal</button>
      </div>
    `;
    document.getElementById('log-meal-btn').addEventListener('click', (e) => {
      const foodNames = foods.map((f) => f.name).join(', ') || `estimated ${data.totalCaloriesEstimate || '?'} kcal`;
      addJournalEntry({ type: 'meal', text: `Logged a meal: ${foodNames}` });
      addMeal({
        foods, thumbnail: dataUrl,
        totalCaloriesEstimate: data.totalCaloriesEstimate,
        proteinG: data.proteinG, carbsG: data.carbsG, fatG: data.fatG,
        confidence: data.confidence,
      });
      e.currentTarget.disabled = true;
      e.currentTarget.textContent = 'Logged';
      renderNutritionSummary();
      renderMealHistory();
    });
  }

  // ---------- ambient daily briefing (Oura-inspired: proactive, not button-triggered) ----------
  async function loadDailyBriefing(scores) {
    const slot = document.getElementById('daily-briefing-slot');
    if (!slot) return;
    const todayKey = new Date().toDateString();
    const cached = getBriefing();
    if (cached && cached.dateKey === todayKey) {
      slot.innerHTML = renderBriefingHtml(cached.text);
      return;
    }
    try {
      const topicsSummary = TOPICS.map((t, i) => ({ id: t.id, label: t.label, score: scores[i] }));
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'briefing', topicsSummary, context: { allowWebSearch: false } }),
      });
      const data = await res.json();
      if (!res.ok || data.escalation) return;
      setBriefing({ dateKey: todayKey, text: data.briefing });
      slot.innerHTML = renderBriefingHtml(data.briefing);
    } catch {
      // Ambient/best-effort — silently skip on failure rather than showing an error banner
      // for a feature the user didn't explicitly request this instant.
    }
  }

  function renderBriefingHtml(text) {
    return `
      <div class="daily-briefing">
        <span class="daily-briefing-icon">${lcIcon('bolt', 18)}</span>
        <span class="daily-briefing-text"><span class="daily-briefing-label">Today's briefing</span>${escapeHtml(text)}</span>
      </div>
    `;
  }

  function renderTodayActions(candidates) {
    const list = document.getElementById('today-actions-list');
    if (!candidates.length) {
      list.innerHTML = `<div class="today-empty">Set up your profile to get personalized actions.</div>`;
      return;
    }
    list.innerHTML = candidates.map(({ t, state }, i) => {
      const accent = topicAccent(t.id);
      const domain = domainForTopic(t.id);
      const result = state.lastResult;
      const hasPlan = result && !result.escalation;
      const headline = hasPlan ? (result.headline || deriveHeadline(result.doThis)) : t.label;
      const sub = hasPlan ? (result.personalizationNote || result.doThis || '') : (t.description || 'No plan yet for this topic.');
      const allDone = state.days.every(Boolean);
      let cta;
      if (!hasPlan) {
        cta = `<button class="btn btn-secondary today-open-btn" data-topic="${t.id}">Open topic</button>`;
      } else if (allDone) {
        cta = `<span class="evidence-strength strength-strong">${lcIcon('check', 11)} Week done</span>`;
      } else {
        cta = `<button class="btn btn-primary today-mark-btn" data-topic="${t.id}">${lcIcon('bolt', 14)} Mark done</button>`;
      }
      return `
        <div class="today-action-card stagger-item" style="--i:${i}" data-topic="${t.id}">
          <span class="today-action-icon" style="color:${accent};background:${accent}22">${lcIcon(domain ? domain.icon : t.icon, 20)}</span>
          <div class="today-action-body">
            <div class="today-action-topic">${domain ? escapeHtml(domain.label.toUpperCase()) + ' · ' : ''}${escapeHtml(t.label)}</div>
            <div class="today-action-headline">${escapeHtml(headline)}</div>
            ${sub ? `<div class="today-action-sub">${escapeHtml(sub)}</div>` : ''}
          </div>
          <span class="today-action-cta">${cta}</span>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.today-mark-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = markNextDayDone(btn.dataset.topic, btn);
        if (s) renderToday();
      });
    });
    list.querySelectorAll('.today-open-btn').forEach((btn) => {
      btn.addEventListener('click', () => navigate(`/topic/${btn.dataset.topic}`));
    });
  }

  // Marks the next not-done day for a topic (used by both the topic page's mark-done button
  // and Today's inline cards) so both entry points share one celebration/journal path.
  function markNextDayDone(topicId, triggerEl) {
    const s = getTopicState(topicId);
    const nextIdx = s.days.findIndex((d) => !d);
    if (nextIdx === -1) return null;
    s.days[nextIdx] = true;
    setTopicState(topicId, s);
    celebrateCompletion(triggerEl, topicId, s);
    renderRail(currentRoute());
    return s;
  }

  // ---------- journal ----------
  function renderJournal() {
    const main = document.getElementById('main');
    const entries = getJournal();
    main.innerHTML = `
      <h1>Journal</h1>
      <p class="subtitle">A timeline of plans generated, actions completed, and milestones reached — all local to this browser.</p>
      <div class="card"><div class="journal-feed" id="journal-feed"></div></div>
    `;
    const feed = document.getElementById('journal-feed');
    if (!entries.length) {
      feed.innerHTML = `<div class="journal-empty">${lcIcon('leaf', 28)}<div style="margin-top:10px">Nothing logged yet — generate a plan or mark a day done to start your timeline.</div></div>`;
      return;
    }
    feed.innerHTML = groupJournalByDay(entries).map(([dayLabel, items]) => `
      <div class="journal-day-group">
        <div class="journal-day-label">${escapeHtml(dayLabel)}</div>
        ${items.map((e) => renderJournalEntryHtml(e)).join('')}
      </div>
    `).join('');
  }

  function renderJournalEntryHtml(e) {
    const topic = e.topicId ? TOPICS.find((t) => t.id === e.topicId) : null;
    const icon = e.type === 'levelup' ? 'bolt' : e.type === 'week' ? 'check' : e.type === 'plan' ? (topic ? topic.icon : 'leaf') : 'check';
    const color = topic ? topicAccent(topic.id) : 'var(--accent)';
    return `
      <div class="journal-entry">
        <span class="journal-entry-icon" style="color:${color}">${lcIcon(icon, 15)}</span>
        <span class="journal-entry-text">${escapeHtml(e.text)}<span class="journal-entry-time">${formatJournalTime(e.ts)}</span></span>
      </div>
    `;
  }

  function groupJournalByDay(entries) {
    const map = new Map();
    entries.forEach((e) => {
      const key = new Date(e.ts).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    const todayKey = new Date().toDateString();
    const yestKey = new Date(Date.now() - 86400000).toDateString();
    return Array.from(map.entries()).map(([key, items]) => {
      let label = new Date(key).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      if (key === todayKey) label = 'Today';
      else if (key === yestKey) label = 'Yesterday';
      return [label, items];
    });
  }

  function formatJournalTime(ts) {
    return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  // ---------- global "Ask Compass" cross-topic coach ----------
  // Full-page immersive Coach — the orb is the center of the screen, not a side panel, closer
  // to Thrive's "coach calls" (real-time voice conversations) than a chat-widget bolt-on.
  function renderCoachView() {
    const main = document.getElementById('main');
    main.innerHTML = `
      <div class="coach-view">
        <div class="coach-orb-stage">
          <button type="button" class="voice-orb voice-orb-lg" id="voice-orb" aria-label="Talk to your coach">
            <span class="orb-layer orb-layer-1"></span>
            <span class="orb-layer orb-layer-2"></span>
            <span class="orb-layer orb-layer-3"></span>
            <span class="orb-3d-host" id="voice-orb-3d"></span>
            <span class="orb-icon">${lcIcon('mic', 30)}</span>
          </button>
          <div class="voice-status" id="voice-status">Tap to speak, or type below</div>
        </div>
        <div class="coach-transcript" id="coach-transcript"></div>
        <div class="coach-input-row">
          <input type="text" class="chat-input" id="coach-input" placeholder="What should I focus on this week?" maxlength="300"/>
          <button class="btn btn-primary" id="coach-send">Send</button>
        </div>
      </div>
    `;

    function renderMessages() {
      const history = getGlobalChat();
      const transcript = document.getElementById('coach-transcript');
      transcript.innerHTML = history.length
        ? history.map((m) => renderChatBubbleHtml(m)).join('')
        : `<div class="coach-empty">Ask anything that spans your topics — "what should I prioritize?", "how do my sleep and stress connect?". This has your full adherence picture, not just one topic's page. Tap the orb to talk instead of typing.</div>`;
      transcript.scrollTop = transcript.scrollHeight;
    }
    renderMessages();

    const input = document.getElementById('coach-input');
    const sendBtn = document.getElementById('coach-send');
    const transcript = document.getElementById('coach-transcript');
    const orb = document.getElementById('voice-orb');
    const voiceStatus = document.getElementById('voice-status');
    let orb3d = null;
    mountOrb3D(document.getElementById('voice-orb-3d'), (ctrl) => { orb3d = ctrl; if (ctrl) orb.classList.add('orb-3d-active'); });

    function setOrbState(state) {
      orb.classList.remove('listening', 'thinking', 'speaking');
      if (state !== 'idle') orb.classList.add(state);
      if (orb3d) orb3d.setState(state);
    }

    async function send(text, viaVoice) {
      text = (text || input.value).trim();
      if (!text) return;
      const history = getGlobalChat();
      history.push({ role: 'user', content: text });
      setGlobalChat(history);
      renderMessages();
      input.value = '';
      input.disabled = true;
      sendBtn.disabled = true;
      setOrbState('thinking');
      voiceStatus.textContent = 'Thinking…';
      transcript.insertAdjacentHTML('beforeend', `<div class="chat-bubble coach" id="coach-loading">${typingDots()}</div>`);
      transcript.scrollTop = transcript.scrollHeight;

      try {
        const settings = getSettings();
        const scores = TOPICS.map((t) => scoreForTopic(t.id));
        const topicsSummary = TOPICS.map((t, i) => ({ id: t.id, label: t.label, score: scores[i], description: t.description }));
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'global',
            profile: getProfile(),
            topicsSummary,
            context: { coachTone: settings.coachTone, allowWebSearch: settings.allowWebSearch },
            history: history.slice(0, -1),
            message: text,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        const reply = data.escalation ? data.message : data.reply;
        const updated = getGlobalChat();
        updated.push({ role: 'coach', content: reply });
        setGlobalChat(updated);
        renderMessages();
        if (getSettings().autoSpeak !== false) {
          setOrbState('speaking');
          voiceStatus.textContent = 'Speaking…';
          speakText(reply, () => { setOrbState('idle'); voiceStatus.textContent = 'Tap to speak, or type below'; });
        } else {
          setOrbState('idle');
          voiceStatus.textContent = 'Tap to speak, or type below';
        }
      } catch (err) {
        document.getElementById('coach-loading')?.remove();
        transcript.insertAdjacentHTML('beforeend', renderChatBubbleHtml({ role: 'coach', content: `Something went wrong: ${err.message}` }));
        setOrbState('idle');
        voiceStatus.textContent = 'Tap to speak, or type below';
      } finally {
        input.disabled = false;
        sendBtn.disabled = false;
      }
    }
    sendBtn.addEventListener('click', () => send());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

    // Voice input: feature-detected Web Speech API. Falls back to a clear inline message
    // (never a silent no-op or a thrown error) if the browser doesn't support it.
    const SR = getSpeechRecognitionCtor();
    let recognition = null;
    let listening = false;
    if (SR) {
      recognition = new SR();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        send(text, true);
      };
      recognition.onerror = () => { listening = false; setOrbState('idle'); voiceStatus.textContent = 'Tap to speak, or type below'; };
      recognition.onend = () => { listening = false; };
    }
    orb.addEventListener('click', () => {
      if (!recognition) {
        voiceStatus.textContent = "Voice input isn't supported in this browser — type below instead.";
        return;
      }
      stopSpeaking();
      if (listening) { recognition.stop(); listening = false; setOrbState('idle'); voiceStatus.textContent = 'Tap to speak, or type below'; return; }
      try {
        recognition.start();
        listening = true;
        setOrbState('listening');
        voiceStatus.textContent = 'Listening…';
      } catch {
        voiceStatus.textContent = 'Could not start the microphone — check browser permissions.';
      }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // The "AI is generating a response" indicator used everywhere a chat reply or plan is being
  // produced — three softly bouncing dots instead of a plain spinner ring.
  function typingDots() {
    return '<span class="typing-dots"><span></span><span></span><span></span></span>';
  }

  // ---------- render dispatch ----------
  function render() {
    const route = currentRoute();
    document.querySelectorAll('.radar-tooltip').forEach((t) => t.classList.remove('show'));
    renderRail(route);
    const main = document.getElementById('main');
    main.classList.remove('view-fade');
    void main.offsetWidth; // force reflow so the fade-in animation restarts on every navigation
    main.classList.add('view-fade');
    if (route.view === 'today') renderToday();
    else if (route.view === 'dashboard') renderDashboard();
    else if (route.view === 'topics') renderTopicsGrid();
    else if (route.view === 'nutrition') renderNutritionLog();
    else if (route.view === 'coach') renderCoachView();
    else if (route.view === 'journal') renderJournal();
    else if (route.view === 'profile') renderProfile();
    else if (route.view === 'settings') renderSettings();
    else if (route.view === 'topic') renderTopic(route.id);
  }

  boot();
})();
