"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { AppleHealthImport } from "@/components/AppleHealthImport";
import { GeneticsImport } from "@/components/GeneticsImport";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import { clearLoggedData, clearEverything, exportAllData } from "@/lib/resetData";
import {
  EMPTY_PROFILE,
  GOAL_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  WORKOUT_STYLE_OPTIONS,
  NUTRITION_PATTERN_OPTIONS,
  TONE_OPTIONS,
  INTENSITY_OPTIONS,
  UNITS_OPTIONS,
  LANGUAGE_OPTIONS,
  type UserProfile,
  type DomainKey,
} from "@/lib/profile";
import styles from "./page.module.css";

type ConfirmState = "none" | "clear" | "reset";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile, hydrated] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [theme, setTheme] = useState<Theme>("light");
  const [confirming, setConfirming] = useState<ConfirmState>("none");
  const [exportedNote, setExportedNote] = useState<string | null>(null);

  useEffect(() => {
    // Mirrors the boot script's own localStorage read — must happen
    // post-mount since the server has no window/localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(getStoredTheme());
  }, []);

  const p = profile ?? EMPTY_PROFILE;

  function update(patch: Partial<UserProfile>) {
    setProfile({ ...p, ...patch });
  }

  function toggleGoal(key: DomainKey) {
    const goals = p.primaryGoals.includes(key)
      ? p.primaryGoals.filter((g) => g !== key)
      : [...p.primaryGoals, key];
    update({ primaryGoals: goals });
  }

  function switchTheme(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  function handleExport() {
    const snapshot = exportAllData();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `longevity-compass-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportedNote("Downloaded — check your browser's downloads.");
  }

  function handleClearLogged() {
    clearLoggedData();
    setConfirming("none");
    window.location.reload();
  }

  function handleResetEverything() {
    clearEverything();
    setConfirming("none");
    router.push("/onboarding");
  }

  if (!hydrated) return null;

  return (
    <div className={styles.page}>
      <SiteNav active="/settings" />

      <div className={styles.header}>
        <span className="eyebrow">Settings</span>
        <h1>Make it yours</h1>
        <p className={styles.headerSub}>
          Your profile, how the coach talks, how it looks, and what happens to your data —
          all of it lives on this device, and all of it is yours to change or erase.
        </p>
      </div>

      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="set-name">Name</label>
              <input
                id="set-name"
                className={styles.input}
                value={p.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="First name"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Age range</span>
              <div className={styles.tagRow}>
                {(["18-29", "30-44", "45-59", "60+"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    className={p.ageRange === range ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                    onClick={() => update({ ageRange: range })}
                    aria-pressed={p.ageRange === range}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Priorities</span>
            <div className={styles.tagRow}>
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  className={p.primaryGoals.includes(g.key) ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                  onClick={() => toggleGoal(g.key)}
                  aria-pressed={p.primaryGoals.includes(g.key)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Activity level</span>
              <div className={styles.tagRow}>
                {ACTIVITY_LEVEL_OPTIONS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    className={p.activityLevel === a.key ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                    onClick={() => update({ activityLevel: a.key })}
                    aria-pressed={p.activityLevel === a.key}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Workout style</span>
              <div className={styles.tagRow}>
                {WORKOUT_STYLE_OPTIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={p.workoutStyle === w ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                    onClick={() => update({ workoutStyle: w })}
                    aria-pressed={p.workoutStyle === w}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Eating pattern</span>
            <div className={styles.tagRow}>
              {NUTRITION_PATTERN_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={p.nutritionPattern === n ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                  onClick={() => update({ nutritionPattern: n })}
                  aria-pressed={p.nutritionPattern === n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How it talks to you</h2>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Tone</span>
            <div className={styles.optionGrid}>
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={p.tone === t.key ? `${styles.option} ${styles.optionActive}` : styles.option}
                  onClick={() => update({ tone: t.key })}
                  aria-pressed={p.tone === t.key}
                >
                  <div className={styles.optionLabel}>{t.label}</div>
                  <p className={styles.optionHint}>{t.hint}</p>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Directness</span>
            <div className={styles.optionGrid}>
              {INTENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={p.intensity === opt.key ? `${styles.option} ${styles.optionActive}` : styles.option}
                  onClick={() => update({ intensity: opt.key })}
                  aria-pressed={p.intensity === opt.key}
                >
                  <div className={styles.optionLabel}>{opt.label}</div>
                  <p className={styles.optionHint}>{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Units</span>
              <div className={styles.tagRow}>
                {UNITS_OPTIONS.map((u) => (
                  <button
                    key={u.key}
                    type="button"
                    className={p.units === u.key ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                    onClick={() => update({ units: u.key })}
                    aria-pressed={p.units === u.key}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="set-language">Coach&apos;s reply language</label>
              <select
                id="set-language"
                className={styles.input}
                value={p.language || "English"}
                onChange={(e) => update({ language: e.target.value as UserProfile["language"] })}
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
              <p className={styles.optionHint} style={{ margin: 0 }}>
                Changes what language the Coach writes back in. The rest of the app&apos;s
                interface stays in English.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          <div className={styles.themeRow}>
            {(["light", "dark"] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                className={theme === t ? `${styles.themeCard} ${styles.themeCardActive}` : styles.themeCard}
                onClick={() => switchTheme(t)}
                aria-pressed={theme === t}
              >
                <span className={t === "dark" ? styles.themeSwatchDark : styles.themeSwatchLight} aria-hidden="true" />
                <span className={styles.themeLabel}>{t === "dark" ? "Cozy (dark)" : "Warm (light)"}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Connected data</h2>
          <p className={styles.sectionSub}>
            Optional. Nothing here is required, and nothing here is uploaded — every import runs
            entirely in this browser tab.
          </p>
          <AppleHealthImport />
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "var(--space-3)" }}>
            <GeneticsImport />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your data</h2>
          <p className={styles.sectionSub}>
            Everything you&apos;ve logged lives only in this browser — there is no account and
            nothing is uploaded anywhere except the single photo or message needed to answer a
            specific question.
          </p>
          <div className={styles.dataRow}>
            <div>
              <div className={styles.dataLabel}>Export everything</div>
              <p className={styles.dataHint}>A JSON file of every entry you&apos;ve logged.</p>
            </div>
            <button type="button" className={styles.btn} onClick={handleExport}>
              Export
            </button>
          </div>
          {exportedNote && <p className={styles.exportedNote}>{exportedNote}</p>}

          <div className={styles.dataRow}>
            <div>
              <div className={styles.dataLabel}>Clear logged history</div>
              <p className={styles.dataHint}>Sleep, meals, workouts, and mind entries — keeps your profile and preferences.</p>
            </div>
            {confirming === "clear" ? (
              <div className={styles.confirmRow}>
                <button type="button" className={styles.btn} onClick={() => setConfirming("none")}>Cancel</button>
                <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleClearLogged}>
                  Yes, clear it
                </button>
              </div>
            ) : (
              <button type="button" className={styles.btn} onClick={() => setConfirming("clear")}>
                Clear
              </button>
            )}
          </div>

          <div className={styles.dataRow}>
            <div>
              <div className={styles.dataLabel}>Reset everything &amp; start over</div>
              <p className={styles.dataHint}>Erases your profile and all logged data, and takes you back through onboarding.</p>
            </div>
            {confirming === "reset" ? (
              <div className={styles.confirmRow}>
                <button type="button" className={styles.btn} onClick={() => setConfirming("none")}>Cancel</button>
                <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={handleResetEverything}>
                  Yes, erase everything
                </button>
              </div>
            ) : (
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setConfirming("reset")}>
                Reset
              </button>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About</h2>
          <p className={styles.sectionSub}>
            Longevity Compass is a coaching tool, not a medical device — every insight is grounded
            in cited research or plainly labeled as an estimate, and anything outside wellness
            coaching gets a direct referral to a licensed professional instead of a guess.
          </p>
        </section>
      </div>
    </div>
  );
}
