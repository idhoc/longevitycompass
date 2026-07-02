// Hand-rolled SVG radar chart. Single series (the user's own adherence across topics), so
// per the dataviz palette: one hue (accent blue), no legend box needed, hairline recessive
// gridlines, 2px line, >=8px vertex markers with a surface ring.
function renderRadar(svgEl, topics, scores, opts) {
  opts = opts || {};
  const size = opts.size || 360;
  const center = size / 2;
  const maxR = center - (opts.padding || 56);
  const n = topics.length;
  const levels = 4;

  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointFor = (i, frac) => {
    const a = angleFor(i);
    return [center + Math.cos(a) * maxR * frac, center + Math.sin(a) * maxR * frac];
  };

  let svg = `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" role="img" aria-label="Radar chart of adherence across ${n} topics">`;

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

  // Data polygon (10% wash fill + 2px line).
  const dataPts = topics.map((_, i) => {
    const frac = Math.max(0, Math.min(1, (scores[i] || 0) / 100));
    return pointFor(i, frac);
  });
  const dataPtsStr = dataPts.map((p) => p.join(',')).join(' ');
  svg += `<polygon points="${dataPtsStr}" fill="var(--accent)" fill-opacity="0.12" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;

  // Vertex markers with surface ring.
  dataPts.forEach(([x, y], i) => {
    svg += `<circle cx="${x}" cy="${y}" r="5" fill="var(--accent)" stroke="var(--surface-1)" stroke-width="2" data-topic="${topics[i].id}" class="radar-point"><title>${topics[i].label}: ${Math.round(scores[i] || 0)}%</title></circle>`;
  });

  // Axis labels.
  topics.forEach((t, i) => {
    const [x, y] = pointFor(i, 1.18);
    const anchor = Math.abs(Math.cos(angleFor(i))) < 0.2 ? 'middle' : Math.cos(angleFor(i)) > 0 ? 'start' : 'end';
    svg += `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" class="radar-label">${escapeXml(shortLabel(t.label))}</text>`;
  });

  svg += '</svg>';
  svgEl.innerHTML = svg;
}

function shortLabel(label) {
  return label.split(' & ')[0];
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
