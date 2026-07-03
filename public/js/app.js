(function () {
  'use strict';

  const STORAGE = {
    profile: 'lc_profile_v1',
    topics: 'lc_topics_v1',
    settings: 'lc_settings_v1',
    onboarded: 'lc_onboarded_v1',
  };

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
      html += `<a class="nav-link ${active}" href="#/topic/${t.id}">${lcIcon(t.icon, 18)}<span class="nav-label">${t.label}</span>${renderMiniRing(pct, 20)}</a>`;
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

  function buildProfileFieldsHtml(profile, idPrefix) {
    const gv = profile.geneticVariants || [];
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

    const genericHtml = `
      <fieldset class="genetic-fieldset" style="grid-column:1/-1">
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

    const flagsHtml = `
      <div class="field checkbox" style="grid-column:1/-1"><input type="checkbox" name="chestPain" id="${idPrefix}-chestPain" ${profile.chestPain ? 'checked' : ''}/><label for="${idPrefix}-chestPain">I'm currently experiencing chest pain</label></div>
      <div class="field checkbox" style="grid-column:1/-1"><input type="checkbox" name="suicidalIdeation" id="${idPrefix}-suicidalIdeation" ${profile.suicidalIdeation ? 'checked' : ''}/><label for="${idPrefix}-suicidalIdeation">I'm having thoughts of harming myself</label></div>
    `;

    return `<div class="form-grid">${fieldsHtml}${flagsHtml}</div>${genericHtml}`;
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
  function renderOnboardingModal() {
    const profile = getProfile();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <h1>Welcome to Longevity Compass</h1>
        <p class="subtitle">A few details make every topic's plan specific to you instead of generic. Everything here stays in your browser, and none of it is used to diagnose anything — skip anything you'd rather not share.</p>
        <form id="onboarding-form"></form>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="onboarding-skip">Skip for now</button>
          <button type="submit" form="onboarding-form" class="btn btn-primary">Save & continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('#onboarding-form');
    form.innerHTML = buildProfileFieldsHtml(profile, 'onboard');
    wireProfileForm(form, 'onboard');

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
        const s = getTopicState(topicId);
        const i = Number(dot.dataset.i);
        s.days[i] = !s.days[i];
        setTopicState(topicId, s);
        onTrackerChanged(topicId, s);
      });
    });
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
      btn.textContent = 'This week complete ✓';
      btn.disabled = true;
    } else {
      btn.textContent = `Mark day ${nextIdx + 1} done`;
      btn.disabled = false;
    }
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
    if (!btn) return;
    updateMarkDoneButton(btn, getTopicState(topicId));
    btn.addEventListener('click', () => {
      const s = getTopicState(topicId);
      const nextIdx = s.days.findIndex((d) => !d);
      if (nextIdx === -1) return;
      s.days[nextIdx] = true;
      setTopicState(topicId, s);
      onTrackerChanged(topicId, s);
    });
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
        <div class="deliverable-box">
          <div class="deliverable-label">Today's deliverable</div>
          <div class="plan-headline-row">
            <span class="plan-headline-icon">${lcIcon(topic ? topic.icon : 'leaf', 22)}</span>
            <div class="plan-headline-text">
              <p class="plan-headline">${escapeHtml(headline)}</p>
              ${result.doThis ? `<p class="plan-subaction">${escapeHtml(result.doThis)}</p>` : ''}
            </div>
          </div>
          <button class="btn btn-primary" id="mark-done-btn" style="margin-top:14px">Mark done</button>
        </div>
        ${result.why ? `<div class="plan-section-label">Why it matters</div><div class="plan-why">${escapeHtml(result.why)}${chipsHtml ? `<div style="margin-top:10px">${chipsHtml}</div>` : ''}</div>` : ''}
        ${result.watchFor ? `<div class="plan-section-label">Heads up</div><div class="plan-watchfor">${lcIcon('chevron', 12)} ${escapeHtml(result.watchFor)}</div>` : ''}
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
