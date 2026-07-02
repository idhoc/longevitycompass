// Minimal hand-authored line icons (24x24, stroke-based, 2px stroke) — no external icon
// font/library dependency so the site stays fully self-contained.
window.LC_ICONS = {
  heart: '<path d="M12 20s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.65-9.5 9-9.5 9Z"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6"/>',
  leaf: '<path d="M5 19c9 0 14-5 14-14-9 0-14 5-14 14Z"/><path d="M5 19c0-6 2-9 6-11"/>',
  atom: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
  hands: '<path d="M8 13V6a1.6 1.6 0 0 1 3.2 0v5"/><path d="M11.2 11V4.6a1.6 1.6 0 0 1 3.2 0V11"/><path d="M14.4 11.4V6a1.6 1.6 0 0 1 3.2 0v8c0 3.5-2.4 6-6.4 6-3 0-4.6-1.2-6-3l-2-3.3c-.6-1 .6-2.1 1.6-1.3L8 15"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  walk: '<circle cx="13.5" cy="4.5" r="1.7"/><path d="M11 22l1.5-6-2-1.5.7-5L15 8l2 3.5-3 1 2.5 3-1 6.5"/><path d="M9.2 15 6 17"/>',
  heartpulse: '<path d="M12 20s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.65-9.5 9-9.5 9Z"/><path d="M4.5 12h3l1.5-3 2 5 1.5-3h6.5"/>',
  droplet: '<path d="M12 3s6 6.8 6 11.2A6 6 0 0 1 6 14.2C6 9.8 12 3 12 3Z"/>',
  brain: '<path d="M9 4.5A2.5 2.5 0 0 0 6.5 7v.3A3 3 0 0 0 5 12a3 3 0 0 0 1.6 4.6A2.7 2.7 0 0 0 9 19.5"/><path d="M15 4.5A2.5 2.5 0 0 1 17.5 7v.3A3 3 0 0 1 19 12a3 3 0 0 1-1.6 4.6A2.7 2.7 0 0 1 15 19.5"/><path d="M9 4.5v15M15 4.5v15M6.7 9.5H9M15 9.5h2.3M6.7 14.5H9M15 14.5h2.3"/>',
  bolt: '<path d="M13 3 5 13h5l-1 8 8-10h-5l1-8Z"/>',
  scale: '<path d="M12 3v18"/><path d="M7 21h10"/><path d="M5 7h6M13 7h6"/><path d="M5 7 2.5 12a2.5 2.5 0 0 0 5 0L5 7Z"/><path d="M19 7l-2.5 5a2.5 2.5 0 0 0 5 0L19 7Z"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 13l4 4 10-10"/>',
};

function lcIcon(name, size) {
  size = size || 20;
  const path = window.LC_ICONS[name] || window.LC_ICONS.leaf;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
