"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { AppleHealthImport } from "@/components/AppleHealthImport";
import { GeneticsImport } from "@/components/GeneticsImport";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import { clearLoggedData, clearEverything, exportAllData } from "@/lib/resetData";
import { t } from "@/lib/i18n";
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
  SEX_OPTIONS,
  ageRangeFromExactAge,
  lbToKg,
  kgToLb,
  ftInToCm,
  cmToFtIn,
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
      <SiteNav />

      <div className={styles.header}>
        <span className="eyebrow">Settings</span>
        <h1>Make it yours</h1>
        <p className={styles.headerSub}>
          Your profile, how the coach talks, how it looks, and what happens to your data —
          all of it lives on this device, and all of it is yours to change or erase.
        </p>
      </div>

      <div className={styles.sections}>
        <details className={styles.section} open>
          <summary className={styles.sectionTitle}>{t(p.language, "Profile")}</summary>
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
              <label className={styles.fieldLabel} htmlFor="set-age">Age</label>
              <input
                id="set-age"
                className={styles.input}
                type="number"
                min={13}
                max={110}
                value={p.exactAge ?? ""}
                onChange={(e) => {
                  const age = e.target.value ? Number(e.target.value) : null;
                  update({ exactAge: age, ageRange: ageRangeFromExactAge(age) });
                }}
                placeholder="Years"
              />
              <p className={styles.optionHint} style={{ margin: 0 }}>
                Reorders and reweights what Topics and Fitness show you first, and grounds what the
                Coach says.
              </p>
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Sex</span>
              <div className={styles.tagRow}>
                {SEX_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={p.sex === s ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                    onClick={() => update({ sex: s })}
                    aria-pressed={p.sex === s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="set-height">
                Height ({p.units === "metric" ? "cm" : "ft/in"})
              </label>
              {p.units === "metric" ? (
                <input
                  id="set-height"
                  className={styles.input}
                  type="number"
                  value={p.heightCm != null ? Math.round(p.heightCm) : ""}
                  onChange={(e) => update({ heightCm: e.target.value ? Number(e.target.value) : null })}
                  placeholder="cm"
                />
              ) : (
                <div className={styles.fieldRow}>
                  <input
                    id="set-height"
                    className={styles.input}
                    type="number"
                    value={p.heightCm != null ? cmToFtIn(p.heightCm).feet : ""}
                    onChange={(e) => {
                      const feet = Number(e.target.value) || 0;
                      const inches = p.heightCm != null ? cmToFtIn(p.heightCm).inches : 0;
                      update({ heightCm: e.target.value ? ftInToCm(feet, inches) : null });
                    }}
                    placeholder="ft"
                  />
                  <input
                    className={styles.input}
                    type="number"
                    value={p.heightCm != null ? cmToFtIn(p.heightCm).inches : ""}
                    onChange={(e) => {
                      const inches = Number(e.target.value) || 0;
                      const feet = p.heightCm != null ? cmToFtIn(p.heightCm).feet : 5;
                      update({ heightCm: ftInToCm(feet, inches) });
                    }}
                    placeholder="in"
                  />
                </div>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="set-weight">
                Weight ({p.units === "metric" ? "kg" : "lb"})
              </label>
              <input
                id="set-weight"
                className={styles.input}
                type="number"
                value={
                  p.weightKg != null
                    ? Math.round(p.units === "metric" ? p.weightKg : kgToLb(p.weightKg))
                    : ""
                }
                onChange={(e) => {
                  if (!e.target.value) return update({ weightKg: null });
                  const n = Number(e.target.value);
                  update({ weightKg: p.units === "metric" ? n : lbToKg(n) });
                }}
                placeholder={p.units === "metric" ? "kg" : "lb"}
              />
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
            <p className={styles.optionHint} style={{ margin: 0 }}>
              Sets the order of the four domains everywhere in the app — Home, Topics, and the nav
              all lead with whatever you pick here first.
            </p>
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
              <p className={styles.optionHint} style={{ margin: 0 }}>
                Sets the baseline Fitness plans against — the Coach mentions it when talking about
                training load.
              </p>
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
              <p className={styles.optionHint} style={{ margin: 0 }}>
                Changes the Fitness page&apos;s written plan focus — doesn&apos;t filter which
                routines you can open.
              </p>
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
            <p className={styles.optionHint} style={{ margin: 0 }}>
              Changes the Nutrition page&apos;s written plan focus and what the Coach assumes about
              how you already eat.
            </p>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionTitle}>{t(p.language, "How it talks to you")}</summary>
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
              <label className={styles.fieldLabel} htmlFor="set-language">App language</label>
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
                Translates navigation, Home, and these Settings headings, and changes what
                language the Coach writes back in. Domain pages (Nutrition, Fitness, Mind,
                Recovery) aren&apos;t translated yet.
              </p>
            </div>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionTitle}>{t(p.language, "Appearance")}</summary>
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
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionTitle}>{t(p.language, "Connected data")}</summary>
          <p className={styles.sectionSub}>
            Optional. Nothing here is required, and nothing here is uploaded — every import runs
            entirely in this browser tab.
          </p>
          <AppleHealthImport />
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "var(--space-3)" }}>
            <GeneticsImport />
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionTitle}>{t(p.language, "Your data")}</summary>
          <p className={styles.sectionSub}>
            Everything you&apos;ve logged lives only in this browser — there is no account and
            nothing is uploaded anywhere except the single photo or message needed to answer a
            specific question.
          </p>

          <div className={styles.privacyBlock}>
            <span className={styles.dataLabel}>What&apos;s stored, and what leaves this device</span>
            <p className={styles.privacyText}>
              Stored only in this browser&apos;s local storage, never transmitted: your profile,
              sleep and vitals entries, logged meals, workout sessions, mind and meditation
              entries, coach conversation history, and any Apple Health or 23andMe data you&apos;ve
              imported.
            </p>
            <p className={styles.privacyText}>
              Sent to an AI provider only at the moment you trigger it, for that one request —
              never in the background: a meal or fridge photo goes to OpenAI for that one
              analysis; a coach message or reflection note goes to OpenAI and Anthropic to
              generate that one reply; a meditation or spoken-reply request goes to OpenAI to
              synthesize that one audio clip. None of it is stored by this app afterward, and nothing
              is sent unless you take that specific action.
            </p>
          </div>

          <div className={styles.dataRow}>
            <div>
              <div className={styles.dataLabel}>Coach web search</div>
              <p className={styles.dataHint}>
                Lets the Coach ground replies in current research via a live web search. Turning it
                off means every reply comes from the model alone — nothing about your conversation
                leaves this app as a search query.
              </p>
            </div>
            <button
              type="button"
              className={p.webSearchEnabled !== false ? `${styles.tag} ${styles.tagActive}` : styles.tag}
              onClick={() => update({ webSearchEnabled: p.webSearchEnabled === false })}
              aria-pressed={p.webSearchEnabled !== false}
            >
              {p.webSearchEnabled !== false ? "On" : "Off"}
            </button>
          </div>

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
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionTitle}>{t(p.language, "About")}</summary>
          <p className={styles.sectionSub}>
            Longevity Compass is a coaching tool, not a medical device — every insight is grounded
            in cited research or plainly labeled as an estimate, and anything outside wellness
            coaching gets a direct referral to a licensed professional instead of a guess.
          </p>
        </details>
      </div>
    </div>
  );
}
