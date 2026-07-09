(function () {
  'use strict';

  const STORAGE = {
    profile: 'lc_profile_v1',
    topics: 'lc_topics_v1',
    settings: 'lc_settings_v1',
    onboarded: 'lc_onboarded_v1',
    journal: 'lc_journal_v1',
    chat: 'lc_chat_v1',
  };
  const JOURNAL_MAX = 60;
  const HISTORY_MAX = 5;

  // Only variants that actually appear in data/sources/micronutrient.md — keeping this list
  // tied to the source library means the options never imply coverage the coach doesn't
  // actually have. Grouped + plain-language described so the checklist reads as a health
  // question, not a genetics exam.
  const GENETIC_VARIANTS = [
    { label: 'MTHFR C677T', desc: 'How your body processes folate (vitamin B9)', icon: 'droplet', category: 'Vitamins & minerals' },
    { label: 'VDR variant', desc: 'How sensitive you are to vitamin D', icon: 'sun', category: 'Vitamins & minerals' },
    { label: 'TRPM6 variant', desc: 'How well you absorb magnesium', icon: 'droplet', category: 'Vitamins & minerals' },
    { label: 'BCMO1 variant', desc: 'Converting beta-carotene into usable vitamin A', icon: 'droplet', category: 'Vitamins & minerals' },
    { label: 'GPX1 variant', desc: 'Selenium use and antioxidant defense', icon: 'droplet', category: 'Vitamins & minerals' },
    { label: 'Zinc transporter variant', desc: 'How well you absorb zinc', icon: 'droplet', category: 'Vitamins & minerals' },
    { label: 'APOE4 allele', desc: 'Fat metabolism and long-term brain/heart aging', icon: 'brain', category: 'Heart & brain' },
    { label: 'FADS1 / ELOVL2 variant', desc: 'How efficiently you convert plant omega-3s', icon: 'brain', category: 'Heart & brain' },
    { label: 'PEMT variant', desc: 'Your dietary choline requirement', icon: 'heartpulse', category: 'Heart & brain' },
    { label: 'HFE mutation', desc: 'Iron absorption and overload risk', icon: 'droplet', category: 'Iron regulation' },
  ];
  const GENETIC_CATEGORIES = ['Vitamins & minerals', 'Heart & brain', 'Iron regulation'];

  const DIET_OPTIONS = ['', 'Standard / omnivore', 'Mediterranean', 'Plant-based / vegetarian', 'Vegan', 'Low-carb / keto', 'Paleo', 'DASH', 'Other'];
  const GOAL_OPTIONS = ['', 'More energy', 'Better sleep', 'Weight management', 'Reduce stress', 'Sharper focus / cognition', 'Healthy aging / longevity', 'Heart health', 'Build strength / muscle', 'Other'];

  let TOPICS = [];

  // ---------- persistence ----------
  function getProfile() {
    try { return JSON.parse(localStorage.getItem(STORAGE.profile)) || {}; }
    catch { return {}; }
  }
  function setProfile(p) { localStorage.setItem(STORAGE.profile, JSON.stringify(p)); }

  function getSettings() {
    const defaults = { theme: 'system', alwaysExpandPlans: false, units: 'metric' };
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(STORAGE.settings)) || {}) }; }
    catch { return defaults; }
  }
  function setSettings(s) { localStorage.setItem(STORAGE.settings, JSON.stringify(s)); }

  function applyTheme() {
    const { theme } = getSettings();
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
  }

  function isOnboarded() { return localStorage.getItem(STORAGE.onboarded) === 'true'; }
  function setOnboarded() { localStorage.setItem(STORAGE.onboarded, 'true'); }

  function getAllTopicState() {
    try { return JSON.parse(localStorage.getItem(STORAGE.topics)) || {}; }
    catch { return {}; }
  }
  function getTopicState(id) {
    const all = getAllTopicState();
    return all[id] || { days: [false, false, false, false, false, false, false], hasViewedFull: false, lastResult: null, history: [] };
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

  // ---------- journal (chronological event log) ----------
  function getJournal() {
    try { return JSON.parse(localStorage.getItem(STORAGE.journal)) || []; }
    catch { return []; }
  }
  function addJournalEntry(entry) {
    const list = getJournal();
    list.unshift({ ts: Date.now(), ...entry });
    localStorage.setItem(STORAGE.journal, JSON.stringify(list.slice(0, JOURNAL_MAX)));
  }

  // ---------- follow-up chat history (per topic) ----------
  function getAllChat() {
    try { return JSON.parse(localStorage.getItem(STORAGE.chat)) || {}; }
    catch { return {}; }
  }
  function getChatHistory(topicId) {
    return getAllChat()[topicId] || [];
  }
  function setChatHistory(topicId, history) {
    const all = getAllChat();
    all[topicId] = history.slice(-20);
    localStorage.setItem(STORAGE.chat, JSON.stringify(all));
  }

  // ---------- routing ----------
  function currentRoute() {
    const hash = location.hash.replace(/^#\/?/, '');
    if (!hash || hash === 'today') return { view: 'today' };
    if (hash === 'dashboard') return { view: 'dashboard' };
    if (hash === 'journal') return { view: 'journal' };
    if (hash === 'profile') return { view: 'profile' };
    if (hash === 'settings') return { view: 'settings' };
    const m = hash.match(/^topic\/(.+)$/);
    if (m) return { view: 'topic', id: m[1] };
    return { view: 'today' };
  }

  function navigate(hash) { location.hash = hash; }

  window.addEventListener('hashchange', render);

  // ---------- boot ----------
  applyTheme();

  async function boot() {
    try {
      const res = await fetch('data/topics.json');
      TOPICS = await res.json();
    } catch (e) {
      document.getElementById('main').innerHTML = '<div class="empty-state">Could not load topic list.</div>';
      return;
    }
    render();
    if (!isOnboarded()) renderOnboardingModal();
  }

  // ---------- sidebar ----------
  function renderSidebar(route) {
    const el = document.getElementById('sidebar');
    const navTop = [
      { key: 'today', icon: 'bolt', label: 'Today' },
      { key: 'dashboard', icon: 'home', label: 'Overview' },
      { key: 'journal', icon: 'leaf', label: 'Journal' },
      { key: 'profile', icon: 'user', label: 'My profile' },
      { key: 'settings', icon: 'settings', label: 'Settings' },
    ];
    const xp = getXP();
    const level = levelForXP(xp);
    const into = xpIntoLevel(xp);

    let html = `<div class="brand">${lcIcon('heart', 22)}<span>Longevity Compass</span></div>`;
    html += `
      <div class="level-badge">
        <div class="level-badge-top">
          <span class="level-badge-title">${lcIcon('bolt', 12)} Lv.${level} ${escapeHtml(levelTitle(level))}</span>
          <span class="level-badge-xp">${into}/${100} XP</span>
        </div>
        <div class="level-badge-track"><div class="level-badge-fill" style="width:${into}%"></div></div>
      </div>
    `;
    html += '<div class="nav-group">';
    for (const item of navTop) {
      const active = route.view === item.key ? 'active' : '';
      html += `<a class="nav-link ${active}" href="#/${item.key}">${lcIcon(item.icon, 18)}<span class="nav-label">${item.label}</span></a>`;
    }
    html += '</div>';

    html += '<div class="nav-group"><div class="nav-heading">Health topics</div>';
    for (const t of TOPICS) {
      const active = route.view === 'topic' && route.id === t.id ? 'active' : '';
      const pct = scoreForTopic(t.id);
      html += `<a class="nav-link ${active}" href="#/topic/${t.id}"><span style="color:${topicAccent(t.id)}">${lcIcon(t.icon, 18)}</span><span class="nav-label">${t.label}</span>${renderMiniRing(pct, 20)}</a>`;
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // ---------- dashboard ----------
  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Still up';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
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

    main.innerHTML = `
      <h1>${greeting()}</h1>
      <p class="subtitle">${subline}</p>
      <div class="stat-row">
        <div class="stat-tile"><div class="stat-value">${onTrack}<span class="stat-of">/${TOPICS.length}</span></div><div class="stat-label">Topics on track</div></div>
        <div class="stat-tile"><div class="stat-value">${notStarted}</div><div class="stat-label">Not started this week</div></div>
        <div class="stat-tile"><div class="stat-value stat-value-text">${escapeHtml(bestLabel)}</div><div class="stat-label">Strongest topic</div></div>
      </div>
      <div class="grid-radar">
        <div class="card radar-wrap"><div id="radar-svg" class="radar-chart-host"></div></div>
        <div class="card">
          <h2>Focus today</h2>
          <p class="subtitle" style="margin-bottom:0">Your three lowest-adherence topics right now.</p>
          <div class="focus-list" id="focus-list"></div>
        </div>
      </div>
    `;

    renderRadar(document.getElementById('radar-svg'), TOPICS, scores, { size: 480 });

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
    document.querySelectorAll('.radar-point').forEach((el) => {
      el.addEventListener('click', () => navigate(`/topic/${el.dataset.topic}`));
    });
  }

  // ---------- today (unified home) ----------
  function renderToday() {
    const main = document.getElementById('main');
    const scores = TOPICS.map((t) => scoreForTopic(t.id));
    const candidates = TOPICS.map((t, i) => ({ t, score: scores[i], state: getTopicState(t.id) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
    const xp = getXP();
    const level = levelForXP(xp);
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const recent = getJournal().slice(0, 5);

    main.innerHTML = `
      <div class="today-hero">
        <div class="today-date">${dateStr}</div>
        <h1 class="today-greeting">${greeting()}</h1>
        <p class="today-sub">Lv.${level} ${escapeHtml(levelTitle(level))} so far. Here${candidates.length > 1 ? "'re" : "'s"} your ${candidates.length > 1 ? 'lowest-adherence topics' : 'topic that needs the most attention'} right now.</p>
        <div class="today-actions-list" id="today-actions-list"></div>
      </div>
      <div class="today-grid">
        <div class="card">
          <h2>Recent activity</h2>
          <p class="subtitle" style="margin-bottom:0">Your latest entries — see the full <a href="#/journal">Journal</a>.</p>
          <div class="journal-feed" id="today-recent-feed" style="margin-top:14px"></div>
        </div>
        <div class="card today-mini-radar-card">
          <div id="today-mini-radar" class="radar-chart-host" style="max-width:260px"></div>
        </div>
      </div>
    `;

    renderTodayActions(candidates);
    renderRadar(document.getElementById('today-mini-radar'), TOPICS, scores, { size: 240, padding: 30, labels: false });
    document.querySelectorAll('#today-mini-radar .radar-point').forEach((el) => {
      el.addEventListener('click', () => navigate(`/topic/${el.dataset.topic}`));
    });

    const recentFeed = document.getElementById('today-recent-feed');
    recentFeed.innerHTML = recent.length
      ? recent.map((e) => renderJournalEntryHtml(e)).join('')
      : `<div class="journal-empty" style="padding:20px">Nothing logged yet — generate a plan or mark a day done.</div>`;
  }

  function renderTodayActions(candidates) {
    const list = document.getElementById('today-actions-list');
    if (!candidates.length) {
      list.innerHTML = `<div class="today-empty">Set up your profile to get personalized actions.</div>`;
      return;
    }
    list.innerHTML = candidates.map(({ t, state }, i) => {
      const accent = topicAccent(t.id);
      const result = state.lastResult;
      const hasPlan = result && !result.escalation;
      const headline = hasPlan ? (result.headline || deriveHeadline(result.doThis)) : t.label;
      const sub = hasPlan ? (result.doThis || '') : (t.description || 'No plan yet for this topic.');
      const allDone = state.days.every(Boolean);
      let cta;
      if (!hasPlan) {
        cta = `<button class="btn btn-secondary today-open-btn" data-topic="${t.id}">Open topic</button>`;
      } else if (allDone) {
        cta = `<span class="evidence-strength strength-strong">${lcIcon('check', 11)} Week done</span>`;
      } else {
        cta = `<button class="btn btn-primary today-mark-btn" data-topic="${t.id}">${lcIcon('bolt', 14)} Mark done <span class="xp-tag">+10 XP</span></button>`;
      }
      return `
        <div class="today-action-card stagger-item" style="--i:${i}">
          <span class="today-action-icon" style="color:${accent};background:${accent}22">${lcIcon(t.icon, 20)}</span>
          <div class="today-action-body">
            <div class="today-action-topic">${escapeHtml(t.label)}</div>
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
  // and Today's inline cards) so both entry points share one celebration/XP/journal path.
  function markNextDayDone(topicId, triggerEl) {
    const s = getTopicState(topicId);
    const nextIdx = s.days.findIndex((d) => !d);
    if (nextIdx === -1) return null;
    s.days[nextIdx] = true;
    setTopicState(topicId, s);
    celebrateCompletion(triggerEl, topicId, s);
    renderSidebar(currentRoute());
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

  // ---------- profile ----------
  // Every field is a select or a number — no free-text boxes, so a plan request never hinges
  // on the LLM parsing an arbitrary sentence out of the profile. "Other" options reveal a
  // small companion text box rather than forcing a pick that doesn't fit.
  const PROFILE_FIELDS = [
    { key: 'age', label: 'Age', type: 'number' },
    { key: 'sex', label: 'Sex', type: 'select', options: ['', 'female', 'male', 'other'] },
    { key: 'weightKg', label: 'Weight', type: 'weight' },
    { key: 'heightCm', label: 'Height', type: 'height' },
    { key: 'sleepHours', label: 'Typical sleep (hrs/night)', type: 'number', step: '0.5' },
    { key: 'dietPattern', label: 'Current diet pattern', type: 'select-other', options: DIET_OPTIONS },
    { key: 'activityLevel', label: 'Activity level', type: 'select', options: ['', 'sedentary', 'light', 'moderate', 'active'] },
    { key: 'stressLevel', label: 'Typical stress level', type: 'select', options: ['', 'low', 'moderate', 'high'] },
    { key: 'primaryGoal', label: 'Your main goal right now', type: 'select-other', options: GOAL_OPTIONS },
    { key: 'restingHeartRate', label: 'Resting heart rate (bpm, optional)', type: 'number' },
    { key: 'systolicBP', label: 'Systolic BP (optional)', type: 'number' },
    { key: 'diastolicBP', label: 'Diastolic BP (optional)', type: 'number' },
  ];

  function kgToLb(kg) { return Math.round(kg * 2.20462 * 10) / 10; }
  function lbToKg(lb) { return Math.round((lb / 2.20462) * 10) / 10; }
  function cmToIn(cm) { return Math.round(cm / 2.54); }
  function inToCm(inches) { return Math.round(inches * 2.54); }

  function buildBasicFieldsHtml(profile, idPrefix) {
    const units = getSettings().units || 'metric';

    const fieldsHtml = PROFILE_FIELDS.map((f) => {
      const val = profile[f.key] ?? '';

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
      return `<div class="field"><label>${f.label}</label><input name="${f.key}" type="${f.type}" ${f.step ? `step="${f.step}"` : ''} value="${val}"/></div>`;
    }).join('');

    const flagsHtml = `
      <div class="field checkbox" style="grid-column:1/-1"><input type="checkbox" name="chestPain" id="${idPrefix}-chestPain" ${profile.chestPain ? 'checked' : ''}/><label for="${idPrefix}-chestPain">I'm currently experiencing chest pain</label></div>
      <div class="field checkbox" style="grid-column:1/-1"><input type="checkbox" name="suicidalIdeation" id="${idPrefix}-suicidalIdeation" ${profile.suicidalIdeation ? 'checked' : ''}/><label for="${idPrefix}-suicidalIdeation">I'm having thoughts of harming myself</label></div>
    `;

    return `<div class="form-grid">${fieldsHtml}${flagsHtml}</div>`;
  }

  function buildGeneticFieldsHtml(profile, idPrefix) {
    const gv = profile.geneticVariants || [];
    return `
      <fieldset class="genetic-fieldset">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <legend>${lcIcon('dna', 16)} Genetic profile (optional)</legend>
          <button type="button" class="btn-text-clear" data-clear-genetics>Clear all</button>
        </div>
        <p class="genetic-hint">If a consumer genetic test (23andMe, clinical panel, etc.) has told you that you carry any of these, select them. This is never used to diagnose — only to point to the matching general-population research for that trait.</p>
        ${GENETIC_CATEGORIES.map((cat) => `
          <div class="genetic-category">
            <div class="genetic-category-label">${cat}</div>
            <div class="genetic-grid">
              ${GENETIC_VARIANTS.filter((v) => v.category === cat).map((v, i) => `
                <label class="genetic-chip ${gv.includes(v.label) ? 'active' : ''}">
                  <input type="checkbox" name="geneticVariants" value="${escapeHtml(v.label)}" id="${idPrefix}-gv-${cat}-${i}" ${gv.includes(v.label) ? 'checked' : ''}/>
                  <span class="genetic-chip-icon">${lcIcon(v.icon, 16)}</span>
                  <span class="genetic-chip-text">
                    <span class="genetic-chip-title">${escapeHtml(v.label)}</span>
                    <span class="genetic-chip-desc">${escapeHtml(v.desc)}</span>
                  </span>
                  <span class="genetic-chip-check">${lcIcon('check', 13)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </fieldset>
    `;
  }

  function buildProfileFieldsHtml(profile, idPrefix) {
    return buildBasicFieldsHtml(profile, idPrefix) + buildGeneticFieldsHtml(profile, idPrefix);
  }

  function wireProfileForm(form, idPrefix) {
    form.querySelectorAll('[data-other-toggle]').forEach((select) => {
      const row = document.getElementById(`${idPrefix}-${select.dataset.otherToggle}`);
      if (!row) return;
      select.addEventListener('change', () => {
        row.style.display = select.value === 'Other' ? '' : 'none';
      });
    });
    form.querySelectorAll('.genetic-chip input').forEach((cb) => {
      cb.addEventListener('change', () => cb.closest('.genetic-chip').classList.toggle('active', cb.checked));
    });
    const clearBtn = form.querySelector('[data-clear-genetics]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        form.querySelectorAll('.genetic-chip input').forEach((cb) => {
          cb.checked = false;
          cb.closest('.genetic-chip').classList.remove('active');
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
      <p class="subtitle">This feeds every topic's coaching request. Nothing here leaves your browser except when you request a plan, and it is never used to diagnose anything.</p>
      <div class="card">
        <form id="profile-form"></form>
        <div class="form-actions">
          <button type="submit" form="profile-form" class="btn btn-primary">Save profile</button>
          <span class="save-note" id="save-note">Saved</span>
        </div>
      </div>
    `;
    const form = document.getElementById('profile-form');
    form.innerHTML = buildProfileFieldsHtml(profile, 'profile');
    wireProfileForm(form, 'profile');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      setProfile(collectProfileFromForm(form));
      const note = document.getElementById('save-note');
      note.classList.add('show');
      setTimeout(() => note.classList.remove('show'), 1500);
    });
  }

  // ---------- onboarding modal (first visit only) ----------
  // A 3-step wizard (basics -> genetics -> review) rather than one long scrolling form —
  // meant to read as a proper "welcome" moment, not a settings page shown too early.
  const WIZARD_STEPS = [
    { title: 'Welcome to Longevity Compass', desc: "A few details make every topic's plan specific to you instead of generic. Nothing here is used to diagnose anything." },
    { title: 'Genetic profile', desc: 'Optional — only add what a real test has told you. Skip this step entirely if you have none.' },
    { title: "You're all set", desc: 'Review what you entered, then jump into your dashboard.' },
  ];

  function renderOnboardingModal() {
    const profile = getProfile();
    let step = 1;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="wizard-progress">
          ${WIZARD_STEPS.map((_, i) => `<div class="wizard-dot" data-dot="${i + 1}"></div>`).join('')}
        </div>
        <h1 id="wizard-title"></h1>
        <p class="subtitle" id="wizard-desc"></p>
        <form id="onboarding-form">
          <div data-step-content="1">${buildBasicFieldsHtml(profile, 'onboard')}</div>
          <div data-step-content="2" style="display:none">${buildGeneticFieldsHtml(profile, 'onboard')}</div>
          <div data-step-content="3" style="display:none" id="wizard-review"></div>
        </form>
        <div class="modal-actions">
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
      if (n === 3) renderReview();
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
      ].filter(([, v]) => v);
      overlay.querySelector('#wizard-review').innerHTML = rows.length
        ? `<div class="review-list">${rows.map(([k, v]) => `<div class="review-row"><span class="review-key">${escapeHtml(k)}</span><span class="review-val">${escapeHtml(String(v))}</span></div>`).join('')}</div>`
        : `<p class="subtitle">Nothing entered yet — that's fine, you can fill this in later from My Profile.</p>`;
    }

    overlay.querySelector('#wizard-next').addEventListener('click', () => showStep(Math.min(WIZARD_STEPS.length, step + 1)));
    overlay.querySelector('#wizard-back').addEventListener('click', () => showStep(Math.max(1, step - 1)));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      setProfile(collectProfileFromForm(form));
      setOnboarded();
      overlay.remove();
      render();
    });
    overlay.querySelector('#onboarding-skip').addEventListener('click', () => {
      setOnboarded();
      overlay.remove();
    });

    showStep(1);
  }

  // ---------- settings ----------
  function renderSettings() {
    const main = document.getElementById('main');
    const settings = getSettings();
    main.innerHTML = `
      <h1>Settings</h1>
      <p class="subtitle">Local to this browser — nothing here is sent anywhere.</p>
      <div class="card">
        <div class="settings-section">
          <div class="settings-row-label">Appearance</div>
          <div class="theme-options" id="theme-options">
            ${['system', 'light', 'dark'].map((t) => `<div class="theme-option ${settings.theme === t ? 'active' : ''}" data-theme-choice="${t}">${t[0].toUpperCase() + t.slice(1)}</div>`).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row-label">Units</div>
          <div class="theme-options" id="units-options">
            ${['metric', 'imperial'].map((u) => `<div class="theme-option ${settings.units === u ? 'active' : ''}" data-units-choice="${u}">${u === 'metric' ? 'Metric (kg / cm)' : 'Imperial (lbs / in)'}</div>`).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Always show full plan detail</div>
              <div class="settings-row-desc">Off by default: a plan you've already opened once collapses to a one-line summary on your next visit.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="always-expand-toggle" ${settings.alwaysExpandPlans ? 'checked' : ''}/>
              <span class="switch-track"></span>
            </label>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-row-label">Backup</div>
          <div class="settings-row-desc" style="margin-bottom:10px">Download everything stored in this browser (profile, genetic markers, topic progress, settings) as a file, or restore from one.</div>
          <div style="display:flex;gap:10px">
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
        applyTheme();
        renderSettings();
      });
    });
    main.querySelectorAll('[data-units-choice]').forEach((el) => {
      el.addEventListener('click', () => {
        const s = getSettings();
        s.units = el.dataset.unitsChoice;
        setSettings(s);
        renderSettings();
      });
    });
    main.querySelector('#always-expand-toggle').addEventListener('change', (e) => {
      const s = getSettings();
      s.alwaysExpandPlans = e.target.checked;
      setSettings(s);
    });
    main.querySelector('#export-data-btn').addEventListener('click', () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        profile: getProfile(),
        topics: getAllTopicState(),
        settings: getSettings(),
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
          setOnboarded();
          alert('Data restored.');
          applyTheme();
          render();
        } catch {
          alert('That file could not be read as a Longevity Compass backup.');
        }
      };
      reader.readAsText(file);
    });
    main.querySelector('#reset-data-btn').addEventListener('click', () => {
      if (!confirm('Reset all local data? This clears your profile, genetic markers, and topic progress on this device.')) return;
      localStorage.removeItem(STORAGE.profile);
      localStorage.removeItem(STORAGE.topics);
      localStorage.removeItem(STORAGE.onboarded);
      navigate('/dashboard');
      location.reload();
    });
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
      <div id="plan-area"></div>
      <div class="tracker-card card">
        <div class="tracker-card-label">This week's progress</div>
        <div class="tracker-row" id="tracker-row"></div>
      </div>
    `;

    renderTracker(topicId, state);
    renderPlanArea(topicId, state);

    document.getElementById('regenerate-btn').addEventListener('click', () => requestPlan(topicId));
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

  // Single source of truth for "a day just got marked done": awards lifetime XP (which never
  // decreases — unchecking a day later does not claw XP back), bursts confetti at the
  // triggering element, and celebrates louder if the whole week just completed.
  function celebrateCompletion(triggerEl, topicId, state) {
    burstConfetti(triggerEl);
    const topic = TOPICS.find((t) => t.id === topicId);
    addJournalEntry({ type: 'done', topicId, text: `Completed today's action for ${topic ? topic.label : 'a topic'}` });
    const { level, leveledUp } = awardXP();
    const allDone = state.days.every(Boolean);
    if (leveledUp) {
      addJournalEntry({ type: 'levelup', text: `Leveled up to Lv.${level} ${levelTitle(level)}` });
      showToast(`${lcIcon('bolt', 16)} Level up! You're now <strong>${escapeHtml(levelTitle(level))}</strong> (Lv.${level})`, { celebrate: true, duration: 3600 });
    } else if (allDone) {
      addJournalEntry({ type: 'week', topicId, text: `Completed a full week of ${topic ? topic.label : 'this topic'}` });
      showToast(`${lcIcon('check', 16)} Full week on ${escapeHtml(topic ? topic.label : 'this topic')}!`, { celebrate: true });
      burstConfetti(triggerEl, { count: 40 });
    }
  }

  function onTrackerChanged(topicId, state) {
    renderSidebar(currentRoute());
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
      btn.innerHTML = `${lcIcon('bolt', 15)} Mark day ${nextIdx + 1} done <span class="xp-tag">+10 XP</span>`;
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
    wireChatPanel(topicId);
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

    return `
      <div class="card plan-card">
        ${result.mock ? '<span class="mock-badge">Mock response — set API keys for a real, grounded plan</span>' : ''}
        <div class="deliverable-box"${accentStyle}>
          <div class="deliverable-label">Today's deliverable</div>
          <div class="plan-headline-row">
            <span class="plan-headline-icon">${lcIcon(topic ? topic.icon : 'leaf', 22)}</span>
            <div class="plan-headline-text">
              <p class="plan-headline">${escapeHtml(headline)}</p>
              ${result.doThis ? `<p class="plan-subaction">${escapeHtml(result.doThis)}</p>` : ''}
            </div>
          </div>
          <button class="btn btn-primary" id="mark-done-btn" style="margin-top:14px"></button>
        </div>
        ${result.why ? `<div class="plan-section-label">Why it matters</div><div class="plan-why">${escapeHtml(result.why)}</div>${evidenceHtml ? `<div class="evidence-card-list">${evidenceHtml}</div>` : ''}` : ''}
        ${foodGuideHtml}
        ${result.watchFor ? `<div class="plan-section-label">Heads up</div><div class="plan-watchfor">${lcIcon('chevron', 12)} ${escapeHtml(result.watchFor)}</div>` : ''}
        <div class="plan-sources-footer">
          ${lcIcon('dna', 13)} ${topic && topic.sourceLabel ? escapeHtml(topic.sourceLabel) : 'Curated research library'}
          ${result.usedWebSearch ? `<span class="web-search-badge">${lcIcon('atom', 11)} Includes live web search</span>` : ''}
        </div>
        ${buildChatPanelHtml(topic)}
      </div>
    `;
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
      const topic = TOPICS.find((t) => t.id === topicId);
      const state = getTopicState(topicId);
      const history = getChatHistory(topicId);
      history.push({ role: 'user', content: text });
      setChatHistory(topicId, history);
      messagesEl.insertAdjacentHTML('beforeend', renderChatBubbleHtml({ role: 'user', content: text }));
      messagesEl.scrollTop = messagesEl.scrollHeight;
      input.value = '';
      input.disabled = true;
      sendBtn.disabled = true;

      const loadingHtml = `<div class="chat-bubble coach" id="chat-loading"><span class="loader"></span></div>`;
      messagesEl.insertAdjacentHTML('beforeend', loadingHtml);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      try {
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'followup',
            topicId,
            profile: getProfile(),
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

  async function requestPlan(topicId) {
    const btn = document.getElementById('regenerate-btn');
    const area = document.getElementById('plan-area');
    btn.disabled = true;
    area.innerHTML = `
      <div class="card">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px"><span class="loader"></span> Grounding in your research library, then formatting the plan…</div>
        <div class="skeleton-line" style="width:70%;height:20px"></div>
        <div class="skeleton-line" style="width:95%"></div>
        <div class="skeleton-line" style="width:88%"></div>
        <div class="skeleton-line" style="width:40%"></div>
      </div>
    `;
    try {
      const priorState = getTopicState(topicId);
      const context = {
        adherencePct: scoreForTopic(topicId),
        recentActions: (priorState.history || []).slice(-HISTORY_MAX),
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- render dispatch ----------
  function render() {
    const route = currentRoute();
    renderSidebar(route);
    const main = document.getElementById('main');
    main.classList.remove('view-fade');
    void main.offsetWidth; // force reflow so the fade-in animation restarts on every navigation
    main.classList.add('view-fade');
    if (route.view === 'today') renderToday();
    else if (route.view === 'dashboard') renderDashboard();
    else if (route.view === 'journal') renderJournal();
    else if (route.view === 'profile') renderProfile();
    else if (route.view === 'settings') renderSettings();
    else if (route.view === 'topic') renderTopic(route.id);
  }

  boot();
})();
