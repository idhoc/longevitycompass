// Confetti bursts, a lifetime XP/level system, and small animation helpers. Kept separate from
// app.js since these are pure presentation/motivation layers with no bearing on the coaching
// data model — the radar/adherence percentages are always the honest current-state numbers;
// XP is a separate, deliberately-never-decreasing "effort so far" track layered on top, so
// unchecking a day (correcting a mistake) never feels punishing, and checking one always feels
// good. This is the intentional replacement for classic "streaks" (which reward not missing a
// day, pressuring fake compliance) — XP rewards total real actions taken, permanently.

const LC_XP_KEY = 'lc_xp_v1';
const XP_PER_ACTION = 10;
const XP_PER_LEVEL = 100;
const LEVEL_TITLES = ['Newcomer', 'Explorer', 'Builder', 'Momentum Builder', 'Consistent', 'Dedicated', 'Compass Master'];

function getXP() {
  const n = Number(localStorage.getItem(LC_XP_KEY));
  return Number.isFinite(n) ? n : 0;
}
function setXP(n) { localStorage.setItem(LC_XP_KEY, String(n)); }
function levelForXP(xp) { return Math.floor(xp / XP_PER_LEVEL) + 1; }
function levelTitle(level) { return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1]; }
function xpIntoLevel(xp) { return xp % XP_PER_LEVEL; }

// Call when a day transitions from not-done to done. Returns { xp, level, leveledUp } so the
// caller can decide whether to show a level-up celebration.
function awardXP() {
  const before = getXP();
  const beforeLevel = levelForXP(before);
  const after = before + XP_PER_ACTION;
  setXP(after);
  const afterLevel = levelForXP(after);
  return { xp: after, level: afterLevel, leveledUp: afterLevel > beforeLevel };
}

// ---------- number count-up ----------
function animateNumber(el, from, to, duration, suffix) {
  suffix = suffix || '';
  const start = performance.now();
  const startVal = from;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.round(startVal + (to - startVal) * eased);
    el.textContent = val + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------- confetti ----------
const CONFETTI_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#e34948', '#e87ba4'];

function burstConfetti(originEl, opts) {
  opts = opts || {};
  const count = opts.count || 22;
  const rect = originEl.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const angle = (Math.random() * Math.PI * 2);
    const distance = 60 + Math.random() * 90;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - 40;
    const rot = Math.round(Math.random() * 360);
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const size = 5 + Math.round(Math.random() * 5);
    piece.style.cssText = [
      `left:${originX}px`, `top:${originY}px`,
      `--x:${x}px`, `--y:${y}px`, `--rot:${rot}deg`,
      `background:${color}`, `width:${size}px`, `height:${size * (Math.random() > 0.5 ? 1 : 2.2)}px`,
    ].join(';');
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
    setTimeout(() => piece.remove(), 1400);
  }
}

// ---------- toast ----------
function showToast(html, opts) {
  opts = opts || {};
  const el = document.createElement('div');
  el.className = 'lc-toast' + (opts.celebrate ? ' lc-toast-celebrate' : '');
  el.innerHTML = html;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const life = opts.duration || 3200;
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, life);
}
