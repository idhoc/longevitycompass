// Hand-rolled SVG radar chart. Single series (the user's own adherence across topics), so
// per the dataviz palette: one hue (accent blue), no legend box needed, hairline recessive
// gridlines, 2px line, >=8px vertex markers with a surface ring. A radial gradient (light-
// to-accent, still one hue — the sequential ramp, not a second color) and a center hero
// number add visual weight without turning it into a categorical/rainbow chart.
function renderRadar(svgEl, topics, scores, opts) {
  opts = opts || {};
  const size = opts.size || 480;
  const center = size / 2;
  const maxR = center - (opts.padding || 96);
  const n = topics.length;
  const levels = 4;
  const gradId = 'radarFill-' + Math.random().toString(36).slice(2, 8);

  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointFor = (i, frac) => {
    const a = angleFor(i);
    return [center + Math.cos(a) * maxR * frac, center + Math.sin(a) * maxR * frac];
  };

  let svg = `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" role="img" aria-label="Radar chart of adherence across ${n} topics">`;
  svg += `<defs><radialGradient id="${gradId}" cx="50%" cy="50%" r="65%">
    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.32"/>
    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.08"/>
  </radialGradient></defs>`;

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

  // Data polygon (gradient wash + 2px line), faded in for a touch of life on load.
  const dataPts = topics.map((_, i) => {
    const frac = Math.max(0, Math.min(1, (scores[i] || 0) / 100));
    return pointFor(i, frac);
  });
  const dataPtsStr = dataPts.map((p) => p.join(',')).join(' ');
  svg += `<g class="radar-data-anim">`;
  svg += `<polygon points="${dataPtsStr}" fill="url(#${gradId})" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;
  dataPts.forEach(([x, y], i) => {
    svg += `<circle cx="${x}" cy="${y}" r="5" fill="var(--accent)" stroke="var(--surface-1)" stroke-width="2" data-topic="${topics[i].id}" class="radar-point"><title>${topics[i].label}: ${Math.round(scores[i] || 0)}%</title></circle>`;
  });
  svg += `</g>`;

  // Center hero number: overall average across all topics.
  const avg = Math.round(scores.reduce((a, b) => a + (b || 0), 0) / (scores.length || 1));
  svg += `<text x="${center}" y="${center - 6}" text-anchor="middle" class="radar-hero-num">${avg}%</text>`;
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
