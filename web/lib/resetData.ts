import { JOURNAL_KEY } from "./journal";

/**
 * Every localStorage key this app writes, in one place, so "reset data" in
 * Settings can never miss one and leave stale data behind (a real bug this
 * app hit before once the fitness week-key exists — see DYNAMIC_PREFIXES).
 */
const LOGGED_DATA_KEYS = [
  "lc_sleep_entries_v1",
  "lc_meals_v1",
  "lc_recipes_v1",
  "lc_workout_sessions_v1",
  "lc_custom_workouts_v1",
  "lc_mind_entries_v1",
  "lc_meditation_sessions_v1",
  "lc_focus_sessions_v1",
  "lc_genetics_v1",
  JOURNAL_KEY,
];

const PROFILE_KEYS = ["lc_profile_v1", "lc_onboarding_skipped_v1"];

const DYNAMIC_PREFIXES = ["lc_fitness_"];

function removeAllMatching(keys: string[], prefixes: string[]) {
  keys.forEach((k) => window.localStorage.removeItem(k));
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && prefixes.some((p) => key.startsWith(p))) toRemove.push(key);
  }
  toRemove.forEach((k) => window.localStorage.removeItem(k));
}

/** Clears all logged history (sleep, meals, workouts, mind, meditation) but
 * keeps the profile, tone/intensity preferences, and theme intact. */
export function clearLoggedData() {
  removeAllMatching(LOGGED_DATA_KEYS, DYNAMIC_PREFIXES);
}

/** Clears everything, including the profile — sends the user back through
 * onboarding on next load. Theme is a display preference, not user data,
 * so it's left alone. */
export function clearEverything() {
  removeAllMatching([...LOGGED_DATA_KEYS, ...PROFILE_KEYS], DYNAMIC_PREFIXES);
}

export interface ExportedData {
  exportedAt: string;
  data: Record<string, unknown>;
}

/** A flat JSON snapshot of every lc_-prefixed key — the "export my data"
 * counterpart to reset, so leaving never means losing it silently. */
export function exportAllData(): ExportedData {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith("lc_")) continue;
    const raw = window.localStorage.getItem(key);
    if (raw == null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return { exportedAt: new Date().toISOString(), data };
}
