// Hand-rolled SVG radar chart. Single series (the user's own adherence across topics), so
// per the dataviz palette: one hue (accent blue), no legend box needed, hairline recessive
// gridlines, >=8px vertex markers with a surface ring. A radial gradient (light-to-accent,
// still one hue — the sequential ramp, not a second color), a soft glow on the data line, a
// center hero number, and a rich hover tooltip add weight and interactivity without turning
// it into a categorical/rainbow chart. On every re-render it morphs from its previous shape
// to the new one (rAF-tweened) rather than snapping — the chart is not re-created, only its
// dynamic pieces (polygon + points + hero number) are animated in place.
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

  let svg = `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" role="img" aria-label="Radar chart of adherence across ${n} topics">`;
  svg += `<defs>
    <radialGradient id="${gradId}" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.06"/>
    </radialGradient>
    <filter id="${glowId}" x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="0" stdDeviation="5" style="flood-color:var(--accent)" flood-opacity="0.5"/>
    </filter>
  </defs>`;

  // Gridlines (concentric rings) — hairline, recessive.
  for (let lvl = 1; lvl <= levels; lvl++) {
    const frac = lvl / levels;
    const pts = topics.map((_, i) => pointFor(i, frac).join(',')).join(' ');
    svg += `<polygon points="${pts}" fill="none" stroke="var(--gridline)" stroke-width="1"/>`;
  }

  // Spokes.
  topics.forEach((_, i) => {
    const [x, y] = pointFor(i, 1);
    svg += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="var(--gridline)" stroke-width="1"/>`;
  });

  // Data polygon + vertex markers — start positioned at the PREVIOUS shape; the tween below
  // animates them to the target shape so consecutive renders morph instead of snapping.
  const startPts = topics.map((_, i) => pointFor(i, prevScores[i] / 100));
  svg += `<g class="radar-data-anim">`;
  svg += `<polygon id="${gradId}-poly" points="${startPts.map((p) => p.join(',')).join(' ')}" fill="url(#${gradId})" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#${glowId})"/>`;
  startPts.forEach(([x, y], i) => {
    svg += `<circle cx="${x}" cy="${y}" r="6" fill="var(--accent)" stroke="var(--surface-1)" stroke-width="2" data-topic="${topics[i].id}" data-idx="${i}" class="radar-point"/>`;
  });
  svg += `</g>`;

  // Center hero number: overall average across all topics.
  const prevAvg = Math.round(prevScores.reduce((a, b) => a + b, 0) / (n || 1));
  svg += `<text x="${center}" y="${center - 6}" text-anchor="middle" class="radar-hero-num" id="${gradId}-hero">${prevAvg}%</text>`;
  svg += `<text x="${center}" y="${center + 15}" text-anchor="middle" class="radar-hero-label">overall</text>`;

  // Axis labels with topic icon, via foreignObject so we can reuse the existing icon set.
  topics.forEach((t, i) => {
    const [x, y] = pointFor(i, 1.22);
    const cos = Math.cos(angleFor(i));
    const justify = Math.abs(cos) < 0.2 ? 'center' : cos > 0 ? 'flex-start' : 'flex-end';
    const w = 96;
    svg += `<foreignObject x="${x - w / 2}" y="${y - 11}" width="${w}" height="22" style="overflow:visible;pointer-events:none">
      <div xmlns="http://www.w3.org/1999/xhtml" class="radar-label-html" style="justify-content:${justify}">
        <span class="radar-label-icon">${lcIcon(t.icon, 13)}</span><span>${escapeXml(shortLabel(t))}</span>
      </div>
    </foreignObject>`;
  });

  svg += '</svg>';
  svgEl.innerHTML = svg;

  tweenRadar(svgEl, gradId, topics, pointFor, prevScores, targetScores);
  attachRadarTooltip(svgEl, topics, targetScores);
  svgEl._lcLastScores = targetScores;
}

function tweenRadar(svgEl, gradId, topics, pointFor, fromScores, toScores) {
  const poly = svgEl.querySelector(`#${gradId}-poly`);
  const hero = svgEl.querySelector(`#${gradId}-hero`);
  const dots = svgEl.querySelectorAll('.radar-point');
  const n = topics.length;
  const fromAvg = fromScores.reduce((a, b) => a + b, 0) / (n || 1);
  const toAvg = toScores.reduce((a, b) => a + b, 0) / (n || 1);
  const duration = 700;
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

// Per-topic identity color, drawn from the validated categorical palette (fixed order, best
// adjacent-pair CVD separation) — used for icon badges, plan-card headers, and sidebar accents.
// Deliberately NOT used on the radar chart itself: the radar is one series' magnitude across
// categories, which calls for a single sequential hue, not categorical color per axis.
const TOPIC_ACCENTS = {
  nutrition: { light: '#2a78d6', dark: '#3987e5' },
  'gut-microbiome': { light: '#1baf7a', dark: '#199e70' },
  purpose: { light: '#4a3aa7', dark: '#9085e9' },
  sleep: { light: '#008300', dark: '#008300' },
  activity: { light: '#eb6834', dark: '#d95926' },
  'metabolic-cv': { light: '#e34948', dark: '#e66767' },
  micronutrient: { light: '#1baf7a', dark: '#199e70' },
  cognitive: { light: '#4a3aa7', dark: '#9085e9' },
  'energy-mitochondrial': { light: '#eda100', dark: '#c98500' },
  weight: { light: '#e87ba4', dark: '#d55181' },
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

// Small sidebar/topic-list indicator: a compact ring instead of a bare "72%" — same data,
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
