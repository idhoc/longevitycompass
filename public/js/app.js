(function () {
  'use strict';

  const STORAGE = {
    profile: 'lc_profile_v1',
    topics: 'lc_topics_v1',
    settings: 'lc_settings_v1',
    onboarded: 'lc_onboarded_v1',
  };

  // Only variants that actually appear in data/sources/micronutrient.md — keeping this list
  // tied to the source library means the checkbox options never imply coverage the coach
  // doesn't actually have.
  const GENETIC_VARIANTS = [
    'MTHFR C677T (folate metabolism)',
    'VDR (vitamin D receptor)',
    'APOE4 allele',
    'HFE (iron overload)',
    'TRPM6 (magnesium absorption)',
    'FADS1 / ELOVL2 (omega-3 conversion)',
    'PEMT (choline)',
    'BCMO1 (beta-carotene conversion)',
    'GPX1 (selenium / antioxidant defense)',
    'Zinc transporter gene variant',
  ];

  let TOPICS = [];

  // ---------- persistence ----------
  function getProfile() {
    try { return JSON.parse(localStorage.getItem(STORAGE.profile)) || {}; }
    catch { return {}; }
  }
  function setProfile(p) { localStorage.setItem(STORAGE.profile, JSON.stringify(p)); }

  function getSettings() {
    const defaults = { theme: 'system', alwaysExpandPlans: false };
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
    return all[id] || { days: [false, false, false, false, false, false, false], hasViewedFull: false, lastResult: null };
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

  // ---------- routing ----------
  function currentRoute() {
    const hash = location.hash.replace(/^#\/?/, '');
    if (!hash || hash === 'dashboard') return { view: 'dashboard' };
    if (hash === 'profile') return { view: 'profile' };
    if (hash === 'settings') return { view: 'settings' };
    const m = hash.match(/^topic\/(.+)$/);
    if (m) return { view: 'topic', id: m[1] };
    return { view: 'dashboard' };
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
      { key: 'dashboard', icon: 'home', label: 'Dashboard' },
      { key: 'profile', icon: 'user', label: 'My profile' },
      { key: 'settings', icon: 'settings', label: 'Settings' },
    ];
    let html = `<div class="brand">${lcIcon('heart', 22)}<span>Longevity Compass</span></div>`;
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
      html += `<a class="nav-link ${active}" href="#/topic/${t.id}">${lcIcon(t.icon, 18)}<span class="nav-label">${t.label}</span><span class="nav-pct">${pct}%</span></a>`;
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // ---------- dashboard ----------
  function renderDashboard() {
    const main = document.getElementById('main');
    const scores = TOPICS.map((t) => scoreForTopic(t.id));
    const focusOrder = TOPICS.map((t, i) => ({ t, score: scores[i] }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    main.innerHTML = `
      <h1>Your longevity radar</h1>
      <p class="subtitle">Fills in as you complete each topic's daily action.</p>
      <div class="grid-2">
        <div class="card radar-wrap"><svg id="radar-svg" style="max-width:360px"></svg></div>
        <div class="card">
          <h2>Focus today</h2>
          <p class="subtitle" style="margin-bottom:0">Your three lowest-adherence topics right now.</p>
          <div class="focus-list" id="focus-list"></div>
        </div>
      </div>
    `;

    renderRadar(document.getElementById('radar-svg'), TOPICS, scores, { size: 360 });

    const focusList = document.getElementById('focus-list');
    focusList.innerHTML = focusOrder.map(({ t, score }) => `
      <div class="focus-item" data-topic="${t.id}">
        <span class="icon-badge">${lcIcon(t.icon, 20)}</span>
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

  // ---------- profile ----------
  const PROFILE_FIELDS = [
    { key: 'age', label: 'Age', type: 'number' },
    { key: 'sex', label: 'Sex', type: 'select', options: ['', 'female', 'male', 'other'] },
    { key: 'weightKg', label: 'Weight (kg)', type: 'number' },
    { key: 'heightCm', label: 'Height (cm)', type: 'number' },
    { key: 'sleepHours', label: 'Typical sleep (hrs/night)', type: 'number', step: '0.5' },
    { key: 'dietPattern', label: 'Current diet pattern', type: 'text' },
    { key: 'activityLevel', label: 'Activity level', type: 'select', options: ['', 'sedentary', 'light', 'moderate', 'active'] },
    { key: 'stressLevel', label: 'Typical stress level', type: 'select', options: ['', 'low', 'moderate', 'high'] },
    { key: 'primaryGoal', label: 'Your main goal right now', type: 'text' },
    { key: 'restingHeartRate', label: 'Resting heart rate (bpm, optional)', type: 'number' },
    { key: 'systolicBP', label: 'Systolic BP (optional)', type: 'number' },
    { key: 'diastolicBP', label: 'Diastolic BP (optional)', type: 'number' },
  ];

  function buildProfileFieldsHtml(profile, idPrefix) {
    const gv = profile.geneticVariants || [];
    const fieldsHtml = PROFILE_FIELDS.map((f) => {
      const val = profile[f.key] ?? '';
      if (f.type === 'select') {
        return `<div class="field"><label>${f.label}</label><select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${o === val ? 'selected' : ''}>${o || '—'}</option>`).join('')}</select></div>`;
      }
      return `<div class="field"><label>${f.label}</label><input name="${f.key}" type="${f.type}" ${f.step ? `step="${f.step}"` : ''} value="${val}"/></div>`;
    }).join('');

    const geneticHtml = `
      <fieldset class="genetic-fieldset form-grid" style="grid-column:1/-1">
        <legend>Genetic profile (optional)</legend>
        <p class="genetic-hint" style="grid-column:1/-1">If a consumer genetic test (23andMe, clinical panel, etc.) has told you that you carry any of these, check them. Skip anything you're unsure of — this is never used to diagnose, only to point to the matching general-population research.</p>
        <div class="genetic-grid" style="grid-column:1/-1">
          ${GENETIC_VARIANTS.map((v, i) => `
            <label class="genetic-option">
              <input type="checkbox" name="geneticVariants" value="${escapeHtml(v)}" id="${idPrefix}-gv-${i}" ${gv.includes(v) ? 'checked' : ''}/>
              ${escapeHtml(v)}
            </label>
          `).join('')}
        </div>
      </fieldset>
    `;

    const flagsHtml = `
      <div class="field checkbox" style="grid-column:1/-1"><input type="checkbox" name="chestPain" id="${idPrefix}-chestPain" ${profile.chestPain ? 'checked' : ''}/><label for="${idPrefix}-chestPain">I'm currently experiencing chest pain</label></div>
      <div class="field checkbox" style="grid-column:1/-1"><input type="checkbox" name="suicidalIdeation" id="${idPrefix}-suicidalIdeation" ${profile.suicidalIdeation ? 'checked' : ''}/><label for="${idPrefix}-suicidalIdeation">I'm having thoughts of harming myself</label></div>
    `;

    return fieldsHtml + flagsHtml + geneticHtml;
  }

  function collectProfileFromForm(form) {
    const fd = new FormData(form);
    const next = {};
    for (const f of PROFILE_FIELDS) next[f.key] = fd.get(f.key) || '';
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
        <form id="profile-form" class="form-grid"></form>
        <div class="form-actions">
          <button type="submit" form="profile-form" class="btn btn-primary">Save profile</button>
          <span class="save-note" id="save-note">Saved</span>
        </div>
      </div>
    `;
    const form = document.getElementById('profile-form');
    form.innerHTML = buildProfileFieldsHtml(profile, 'profile');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      setProfile(collectProfileFromForm(form));
      const note = document.getElementById('save-note');
      note.classList.add('show');
      setTimeout(() => note.classList.remove('show'), 1500);
    });
  }

  // ---------- onboarding modal (first visit only) ----------
  function renderOnboardingModal() {
    const profile = getProfile();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <h1>Welcome to Longevity Compass</h1>
        <p class="subtitle">A few details make every topic's plan specific to you instead of generic. Everything here stays in your browser, and none of it is used to diagnose anything — skip anything you'd rather not share.</p>
        <form id="onboarding-form" class="form-grid"></form>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="onboarding-skip">Skip for now</button>
          <button type="submit" form="onboarding-form" class="btn btn-primary">Save & continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('#onboarding-form');
    form.innerHTML = buildProfileFieldsHtml(profile, 'onboard');

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
          <div class="settings-row-label">Data</div>
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
    main.querySelector('#always-expand-toggle').addEventListener('change', (e) => {
      const s = getSettings();
      s.alwaysExpandPlans = e.target.checked;
      setSettings(s);
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

    main.innerHTML = `
      <div class="topic-header">
        <div class="topic-title-row">
          <span class="icon-badge">${lcIcon(topic.icon, 20)}</span>
          <div>
            <h1 style="margin-bottom:2px">${topic.label}</h1>
            <p class="subtitle" style="margin-bottom:0">${score}% adherence this week</p>
          </div>
        </div>
        <button class="btn btn-secondary" id="regenerate-btn">${state.lastResult ? 'Regenerate plan' : 'Get today’s plan'}</button>
      </div>
      ${topic.knownLimitation ? `<div class="limitation-note">${escapeHtml(topic.knownLimitation)}</div>` : ''}
      <div class="tracker-row" id="tracker-row"></div>
      <div id="plan-area"></div>
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
        const s = getTopicState(topicId);
        const i = Number(dot.dataset.i);
        s.days[i] = !s.days[i];
        setTopicState(topicId, s);
        renderSidebar(currentRoute());
        renderTracker(topicId, s);
        const scoreEl = document.querySelector('.topic-header .subtitle');
        if (scoreEl) scoreEl.textContent = `${scoreForTopic(topicId)}% adherence this week`;
      });
    });
  }

  function renderPlanArea(topicId, state) {
    const area = document.getElementById('plan-area');
    const topic = TOPICS.find((t) => t.id === topicId);

    if (!state.lastResult) {
      area.innerHTML = '<div class="empty-state">No plan yet — click "Get today’s plan" above.</div>';
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
    } else {
      area.innerHTML = `
        <div class="card collapsed-summary" id="collapsed-toggle">
          <span class="summary-text"><strong>${escapeHtml(result.headline || 'Today’s action')}</strong> — ${escapeHtml(result.doThis || '—')}</span>
          <span class="chevron">${lcIcon('chevron', 16)}</span>
        </div>
      `;
      document.getElementById('collapsed-toggle').addEventListener('click', () => {
        area.innerHTML = buildFullCard(result, topic);
      }, { once: true });
    }
  }

  function buildFullCard(result, topic) {
    const evidence = (result.evidence && result.evidence.length)
      ? result.evidence
      : deriveEvidenceChips(result.why);
    const chipsHtml = evidence.map((e) =>
      `<span class="evidence-chip ${e.type === 'limitation' ? 'limitation' : ''}">${escapeHtml(e.text)}</span>`
    ).join('');
    const headline = result.headline || deriveHeadline(result.doThis);

    return `
      <div class="card plan-card">
        ${result.mock ? '<span class="mock-badge">Mock response — set API keys for a real, grounded plan</span>' : ''}
        <div class="plan-headline-row">
          <span class="plan-headline-icon">${lcIcon(topic ? topic.icon : 'leaf', 22)}</span>
          <div class="plan-headline-text">
            <p class="plan-headline">${escapeHtml(headline)}</p>
            ${result.doThis ? `<p class="plan-subaction">${escapeHtml(result.doThis)}</p>` : ''}
          </div>
        </div>
        ${result.why ? `<hr class="plan-divider"/><div class="plan-why">${escapeHtml(result.why)}${chipsHtml ? `<div style="margin-top:10px">${chipsHtml}</div>` : ''}</div>` : ''}
        ${result.watchFor ? `<div class="plan-watchfor">⚑ ${escapeHtml(result.watchFor)}</div>` : ''}
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

  async function requestPlan(topicId) {
    const btn = document.getElementById('regenerate-btn');
    const area = document.getElementById('plan-area');
    btn.disabled = true;
    area.innerHTML = `<div class="empty-state"><span class="loader"></span> Building your plan…</div>`;
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, profile: getProfile() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      const isMock = (data.raw || '').includes('[MOCK') || (data.why || '').includes('mock');
      const state = getTopicState(topicId);
      state.lastResult = { ...data, mock: isMock };
      if (!data.escalation) state.hasViewedFull = false; // show full detail again for a fresh plan
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
    if (route.view === 'dashboard') renderDashboard();
    else if (route.view === 'profile') renderProfile();
    else if (route.view === 'settings') renderSettings();
    else if (route.view === 'topic') renderTopic(route.id);
  }

  boot();
})();
