(function () {
  'use strict';

  const STORAGE = {
    profile: 'lc_profile_v1',
    topics: 'lc_topics_v1',
  };

  let TOPICS = [];

  // ---------- persistence ----------
  function getProfile() {
    try { return JSON.parse(localStorage.getItem(STORAGE.profile)) || {}; }
    catch { return {}; }
  }
  function setProfile(p) { localStorage.setItem(STORAGE.profile, JSON.stringify(p)); }

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
    const m = hash.match(/^topic\/(.+)$/);
    if (m) return { view: 'topic', id: m[1] };
    return { view: 'dashboard' };
  }

  function navigate(hash) { location.hash = hash; }

  window.addEventListener('hashchange', render);

  // ---------- boot ----------
  async function boot() {
    try {
      const res = await fetch('data/topics.json');
      TOPICS = await res.json();
    } catch (e) {
      document.getElementById('main').innerHTML = '<div class="empty-state">Could not load topic list.</div>';
      return;
    }
    render();
  }

  // ---------- sidebar ----------
  function renderSidebar(route) {
    const el = document.getElementById('sidebar');
    const navTop = [
      { key: 'dashboard', icon: 'home', label: 'Dashboard' },
      { key: 'profile', icon: 'user', label: 'My profile' },
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
    form.innerHTML = PROFILE_FIELDS.map((f) => {
      const val = profile[f.key] ?? '';
      if (f.type === 'select') {
        return `<div class="field"><label>${f.label}</label><select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${o === val ? 'selected' : ''}>${o || '—'}</option>`).join('')}</select></div>`;
      }
      return `<div class="field"><label>${f.label}</label><input name="${f.key}" type="${f.type}" ${f.step ? `step="${f.step}"` : ''} value="${val}"/></div>`;
    }).join('') + `
      <div class="field checkbox"><input type="checkbox" name="chestPain" id="chestPain" ${profile.chestPain ? 'checked' : ''}/><label for="chestPain">I'm currently experiencing chest pain</label></div>
      <div class="field checkbox"><input type="checkbox" name="suicidalIdeation" id="suicidalIdeation" ${profile.suicidalIdeation ? 'checked' : ''}/><label for="suicidalIdeation">I'm having thoughts of harming myself</label></div>
    `;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const next = {};
      for (const f of PROFILE_FIELDS) next[f.key] = fd.get(f.key) || '';
      next.chestPain = fd.get('chestPain') === 'on';
      next.suicidalIdeation = fd.get('suicidalIdeation') === 'on';
      setProfile(next);
      const note = document.getElementById('save-note');
      note.classList.add('show');
      setTimeout(() => note.classList.remove('show'), 1500);
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

    if (!state.hasViewedFull) {
      area.innerHTML = buildFullCard(result);
      state.hasViewedFull = true;
      setTopicState(topicId, state);
    } else {
      area.innerHTML = `
        <div class="card collapsed-summary" id="collapsed-toggle">
          <span class="summary-text"><strong>Do this:</strong> ${escapeHtml(result.doThis || '—')}</span>
          <span class="chevron">${lcIcon('chevron', 16)}</span>
        </div>
      `;
      document.getElementById('collapsed-toggle').addEventListener('click', () => {
        area.innerHTML = buildFullCard(result);
      }, { once: true });
    }
  }

  function buildFullCard(result) {
    const evidence = (result.evidence && result.evidence.length)
      ? result.evidence
      : deriveEvidenceChips(result.why);
    const chipsHtml = evidence.map((e) =>
      `<span class="evidence-chip ${e.type === 'limitation' ? 'limitation' : ''}">${escapeHtml(e.text)}</span>`
    ).join('');

    return `
      <div class="card plan-card">
        ${result.mock ? '<span class="mock-badge">Mock response — set API keys for a real, grounded plan</span>' : ''}
        <div class="plan-row"><div class="plan-label">Do this</div><div class="plan-value">${escapeHtml(result.doThis || '—')}</div></div>
        ${result.why ? `<div class="plan-row"><div class="plan-label">Why</div><div class="plan-value">${escapeHtml(result.why)}${chipsHtml ? `<div style="margin-top:8px">${chipsHtml}</div>` : ''}</div></div>` : ''}
        ${result.watchFor ? `<div class="plan-row"><div class="plan-label">Watch for</div><div class="plan-value">${escapeHtml(result.watchFor)}</div></div>` : ''}
      </div>
    `;
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
    else if (route.view === 'topic') renderTopic(route.id);
  }

  boot();
})();
