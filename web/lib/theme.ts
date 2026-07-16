export type Theme = "dark" | "light";

const KEY = "lc_theme_v1";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const raw = window.localStorage.getItem(KEY);
  return raw === "light" ? "light" : "dark";
}

/** Applies a theme to the document and persists it — the single place both
 * the layout's no-flash boot script and the Settings toggle agree on. */
export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // storage unavailable — the theme still applies for this page view
  }
}
