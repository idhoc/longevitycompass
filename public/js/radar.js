// The "Compass" — this used to be a generic radar/spider chart; it's now built to actually
// read as a physical instrument: a brass bezel with tick marks, topic points as inlaid studs
// around the rim (colored by topic identity), an adherence "field" polygon in a single
// sequential hue (still one series' magnitude, not a rainbow — that principle didn't change),
// and a real compass needle that swings to point at whichever topic is currently strongest.
// On every re-render the needle springs to its new heading and the field morphs to its new
// shape (rAF-tweened) rather than snapping.
function renderRadar(svgEl, topics, scores, opts) {
  opts = opts || {};
  const size = opts.size || 480;
  const center = size / 2;
  const maxR = center - (opts.padding || 96);
  const n = topics.length;
  const levels = 4;
  const gradId = 'radarFill-' + Math.random().toString(36).slice(2, 8);
  const glowId = 'radarGlow-' + Math.random().toString(36).slice(2, 8);

  const prevScores = svgEl._lcLastScores || topics.map(() => 0);
  const targetScores = topics.map((_, i) => Math.max(0, Math.min(100, scores[i] || 0)));

  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointFor = (i, frac) => {
    const a = angleFor(i);
    return [center + Math.cos(a) * maxR * frac, center + Math.sin(a) * maxR * frac];
  };

  const bestIdx = targetScores.reduce((best, s, i) => (s > targetScores[best] ? i : best), 0);
  const prevAngle = svgEl._lcLastNeedleAngle ?? angleFor(0);
  const targetAngle = angleFor(bestIdx);

  let svg = `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" role="img" aria-label="Compass dial of adherence across ${n} topics">`;
  svg += `<defs>
    <radialGradient id="${gradId}" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.05"/>
    </radialGradient>
    <filter id="${glowId}" x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="0" stdDeviation="5" style="flood-color:var(--accent)" flood-opacity="0.45"/>
    </filter>
  </defs>`;

  // Outer bezel ring — the "instrument face" edge.
  svg += `<circle cx="${center}" cy="${center}" r="${maxR + 14}" fill="none" stroke="var(--baseline)" stroke-width="1.5"/>`;
  svg += `<circle cx="${center}" cy="${center}" r="${maxR + 22}" fill="none" stroke="var(--gridline)" stroke-width="1"/>`;

  // Tick marks around the bezel — decorative dial texture, independent of the topic count.
  const TICK_COUNT = 48;
  for (let i = 0; i < TICK_COUNT; i++) {
    const a = (Math.PI * 2 * i) / TICK_COUNT - Math.PI / 2;
    const major = i % 6 === 0;
    const outerR = maxR + 22;
    const innerR = outerR - (major ? 11 : 5);
    const x1 = center + Math.cos(a) * innerR, y1 = center + Math.sin(a) * innerR;
    const x2 = center + Math.cos(a) * outerR, y2 = center + Math.sin(a) * outerR;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="compass-bezel-tick${major ? ' major' : ''}" stroke-width="${major ? 1.6 : 1}"/>`;
  }

  // Adherence gridlines (concentric rings) — hairline, recessive, one hue.
  for (let lvl = 1; lvl <= levels; lvl++) {
    const frac = lvl / levels;
    const pts = topics.map((_, i) => pointFor(i, frac).join(',')).join(' ');
    svg += `<polygon points="${pts}" fill="none" stroke="var(--gridline)" stroke-width="1"/>`;
  }
  topics.forEach((_, i) => {
    const [x, y] = pointFor(i, 1);
    svg += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="var(--gridline)" stroke-width="1"/>`;
  });

  // Data polygon + vertex markers — start at the PREVIOUS shape; tweened below to the target.
  const startPts = topics.map((_, i) => pointFor(i, prevScores[i] / 100));
  svg += `<g class="radar-data-anim">`;
  svg += `<polygon id="${gradId}-poly" points="${startPts.map((p) => p.join(',')).join(' ')}" fill="url(#${gradId})" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#${glowId})"/>`;
  startPts.forEach(([x, y], i) => {
    svg += `<circle cx="${x}" cy="${y}" r="6" fill="var(--accent)" stroke="var(--surface-1)" stroke-width="2" data-topic="${topics[i].id}" data-idx="${i}" class="radar-point"/>`;
  });
  svg += `</g>`;

  // Topic studs inlaid at the bezel rim, colored by topic identity — a categorical label for
  // "which spoke is which topic", not a second encoding of magnitude (the field/vertices above
  // stay single-hue; that's still the actual data channel).
  topics.forEach((t, i) => {
    const [sx, sy] = pointFor(i, (maxR + 22) / maxR);
    svg += `<circle cx="${sx}" cy="${sy}" r="5" fill="${topicAccent(t.id)}" stroke="var(--surface-1)" stroke-width="1.5" data-topic="${t.id}" data-idx="${i}" class="radar-point compass-stud"/>`;
  });

  // Axis labels with topic icon, via foreignObject so we can reuse the existing icon set.
  if (opts.labels !== false) {
    topics.forEach((t, i) => {
      const [x, y] = pointFor(i, (maxR + 22) / maxR + 0.16);
      const cos = Math.cos(angleFor(i));
      const justify = Math.abs(cos) < 0.2 ? 'center' : cos > 0 ? 'flex-start' : 'flex-end';
      const w = 96;
      svg += `<foreignObject x="${x - w / 2}" y="${y - 11}" width="${w}" height="22" style="overflow:visible;pointer-events:none">
        <div xmlns="http://www.w3.org/1999/xhtml" class="radar-label-html" style="justify-content:${justify}">
          <span class="radar-label-icon" style="color:${topicAccent(t.id)}">${lcIcon(t.icon, 13)}</span><span>${escapeXml(shortLabel(t))}</span>
        </div>
      </foreignObject>`;
    });
  }

  // The needle + center readout drawn last, on top of everything. Both are purely decorative
  // and must not intercept clicks — at low/zero adherence every vertex marker collapses to
  // this exact center point, and without pointer-events:none here the pin/needle would sit on
  // top and silently swallow clicks meant for those (still-real, still-clickable) vertices.
  svg += `<g id="${gradId}-needle" class="compass-needle" style="pointer-events:none"></g>`;
  svg += `<circle cx="${center}" cy="${center}" r="7" fill="var(--text-primary)" stroke="var(--surface-1)" stroke-width="1.5" style="pointer-events:none"/>`;
  const prevAvg = Math.round(prevScores.reduce((a, b) => a + b, 0) / (n || 1));
  const readoutY = center + maxR * 0.6;
  svg += `<text x="${center}" y="${readoutY}" text-anchor="middle" class="radar-hero-num" id="${gradId}-hero">${prevAvg}%</text>`;
  svg += `<text x="${center}" y="${readoutY + 19}" text-anchor="middle" class="radar-hero-label">STRONGEST: ${escapeXml(shortLabel(topics[bestIdx]).toUpperCase())}</text>`;

  svg += '</svg>';
  svgEl.innerHTML = svg;

  tweenRadar(svgEl, gradId, topics, pointFor, prevScores, targetScores, prevAngle, targetAngle, center, maxR, bestIdx);
  attachRadarTooltip(svgEl, topics, targetScores);
  svgEl._lcLastScores = targetScores;
  svgEl._lcLastNeedleAngle = targetAngle;
}

function shortestAngleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function buildNeedlePolygons(center, maxR, angle) {
  const len = maxR * 0.88, tailLen = maxR * 0.3, w = 7, w2 = 5;
  const perp = angle + Math.PI / 2;
  const tipX = center + Math.cos(angle) * len, tipY = center + Math.sin(angle) * len;
  const tailX = center - Math.cos(angle) * tailLen, tailY = center - Math.sin(angle) * tailLen;
  const bl = [center + Math.cos(perp) * w, center + Math.sin(perp) * w];
  const br = [center - Math.cos(perp) * w, center - Math.sin(perp) * w];
  const bl2 = [center + Math.cos(perp) * w2, center + Math.sin(perp) * w2];
  const br2 = [center - Math.cos(perp) * w2, center - Math.sin(perp) * w2];
  const front = `${tipX},${tipY} ${bl.join(',')} ${br.join(',')}`;
  const back = `${tailX},${tailY} ${bl2.join(',')} ${br2.join(',')}`;
  return { front, back };
}

function tweenRadar(svgEl, gradId, topics, pointFor, fromScores, toScores, fromAngle, toAngle, center, maxR, bestIdx) {
  const poly = svgEl.querySelector(`#${gradId}-poly`);
  const hero = svgEl.querySelector(`#${gradId}-hero`);
  const needleG = svgEl.querySelector(`#${gradId}-needle`);
  const dots = svgEl.querySelectorAll('.radar-point:not(.compass-stud)');
  const n = topics.length;
  const fromAvg = fromScores.reduce((a, b) => a + b, 0) / (n || 1);
  const toAvg = toScores.reduce((a, b) => a + b, 0) / (n || 1);
  const angleDelta = shortestAngleDelta(fromAngle, toAngle);
  const duration = 750;
  const start = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = toScores.map((target, i) => fromScores[i] + (target - fromScores[i]) * eased);
    const coords = current.map((v, i) => pointFor(i, v / 100));
    if (poly) poly.setAttribute('points', coords.map((p) => p.join(',')).join(' '));
    coords.forEach(([x, y], i) => {
      if (dots[i]) { dots[i].setAttribute('cx', x); dots[i].setAttribute('cy', y); }
    });
    if (hero) hero.textContent = Math.round(fromAvg + (toAvg - fromAvg) * eased) + '%';
    if (needleG) {
      // A slight overshoot-then-settle on the last ~15% of the tween reads as a real needle
      // physically swinging to its heading rather than a UI element sliding.
      const overshoot = t > 0.7 ? Math.sin((t - 0.7) / 0.3 * Math.PI) * 0.06 * (1 - t) : 0;
      const angleNow = fromAngle + angleDelta * eased + overshoot;
      const { front, back } = buildNeedlePolygons(center, maxR, angleNow);
      needleG.innerHTML = `<polygon points="${front}" fill="var(--accent)"/><polygon points="${back}" fill="var(--baseline)"/>`;
    }
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

let _radarTooltipEl = null;
function getRadarTooltip() {
  if (!_radarTooltipEl) {
    _radarTooltipEl = document.createElement('div');
    _radarTooltipEl.className = 'radar-tooltip';
    document.body.appendChild(_radarTooltipEl);
  }
  return _radarTooltipEl;
}

function attachRadarTooltip(svgEl, topics, scores) {
  const tooltip = getRadarTooltip();
  svgEl.querySelectorAll('.radar-point').forEach((el) => {
    const t = topics[Number(el.dataset.idx)];
    const score = Math.round(scores[Number(el.dataset.idx)] || 0);
    el.addEventListener('mouseenter', () => {
      tooltip.innerHTML = `<span class="radar-tooltip-icon" style="color:${topicAccent(t.id)}">${lcIcon(t.icon, 14)}</span><span class="radar-tooltip-label">${escapeXml(t.label)}</span><span class="radar-tooltip-pct">${score}%</span><span class="radar-tooltip-hint">Click to open</span>`;
      tooltip.classList.add('show');
    });
    el.addEventListener('mousemove', (e) => {
      tooltip.style.left = e.clientX + 16 + 'px';
      tooltip.style.top = e.clientY - 14 + 'px';
    });
    el.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
  });
}

// Explicit one-word labels rather than a string-split heuristic — several full topic names
// ("Weight Management & Body Composition", "Physical Activity & Movement") are long enough
// to clip at the chart edge regardless of the first-half split.
const RADAR_SHORT_LABELS = {
  nutrition: 'Nutrition',
  'gut-microbiome': 'Gut Microbiome',
  purpose: 'Purpose',
  sleep: 'Sleep',
  activity: 'Activity',
  'metabolic-cv': 'Metabolic',
  micronutrient: 'Micronutrient',
  cognitive: 'Cognitive',
  'energy-mitochondrial': 'Energy',
  weight: 'Weight',
};
function shortLabel(topic) {
  return RADAR_SHORT_LABELS[topic.id] || topic.label.split(' & ')[0];
}

// Per-topic identity color, now a bespoke jewel-tone set (terracotta/teal/plum/indigo/ochre/
// garnet/moss/violet/amber/rose) replacing the earlier generic blue/green/red/purple/orange
// Material-style set — used for icon badges, plan-card headers, topic-grid tiles, and the
// compass rim studs. Deliberately NOT the encoding for the compass field/vertices themselves,
// which stay one sequential hue (--accent) since that's one series' magnitude, not 10 series.
const TOPIC_ACCENTS = {
  nutrition: { light: '#c2542e', dark: '#e0793f' },
  'gut-microbiome': { light: '#1f7a6b', dark: '#3aa892' },
  purpose: { light: '#7a4d99', dark: '#a67ad1' },
  sleep: { light: '#3a5a99', dark: '#7d9bd9' },
  activity: { light: '#a8641c', dark: '#cf8f3c' },
  'metabolic-cv': { light: '#a5303f', dark: '#d15f6c' },
  micronutrient: { light: '#4a7a3a', dark: '#74a860' },
  cognitive: { light: '#4a3a99', dark: '#8a7de0' },
  'energy-mitochondrial': { light: '#b8901f', dark: '#dbb84c' },
  weight: { light: '#a8456f', dark: '#d97a9c' },
};
function topicAccent(topicId) {
  const pair = TOPIC_ACCENTS[topicId] || TOPIC_ACCENTS.nutrition;
  return document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ? pair.dark
    : pair.light;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Small sidebar/topic-grid indicator: a compact ring instead of a bare "72%" — same data,
// more legible at a glance. Exact number stays available via the title tooltip.
function renderMiniRing(pct, size) {
  size = size || 20;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="mini-ring"><title>${Math.round(pct)}% adherence this week</title>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--gridline)" stroke-width="${stroke}"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="${stroke}" stroke-linecap="round"
      class="mini-ring-fill" style="--ring-circumference:${circumference};--ring-offset:${offset}"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 ${c} ${c})"/>
  </svg>`;
}
