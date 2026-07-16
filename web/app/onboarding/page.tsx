"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  EMPTY_PROFILE,
  GOAL_OPTIONS,
  SLEEP_HOURS_OPTIONS,
  SLEEP_COMPLAINT_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  WORKOUT_STYLE_OPTIONS,
  NUTRITION_PATTERN_OPTIONS,
  type UserProfile,
  type DomainKey,
} from "@/lib/profile";
import styles from "./page.module.css";

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const router = useRouter();
  const [, setProfile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [, setSkipped] = useLocalStorageState<boolean>("lc_onboarding_skipped_v1", false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);

  function toggleGoal(key: DomainKey) {
    setDraft((d) => ({
      ...d,
      primaryGoals: d.primaryGoals.includes(key)
        ? d.primaryGoals.filter((g) => g !== key)
        : [...d.primaryGoals, key],
    }));
  }

  function toggleComplaint(tag: string) {
    setDraft((d) => ({
      ...d,
      sleepComplaints: d.sleepComplaints.includes(tag)
        ? d.sleepComplaints.filter((t) => t !== tag)
        : [...d.sleepComplaints, tag],
    }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function skip() {
    setSkipped(true);
    router.push("/dashboard");
  }

  function finish() {
    setProfile({ ...draft, completedAt: new Date().toISOString() });
    router.push("/dashboard");
  }

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <span className={styles.mark}>
          LC<span className={styles.markDot}>·</span>01
        </span>
        {step < TOTAL_STEPS && (
          <button type="button" className={styles.skip} onClick={skip}>
            Skip for now
          </button>
        )}
      </div>

      {step < TOTAL_STEPS && (
        <div className={styles.progress} role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={i <= step ? `${styles.progressDot} ${styles.progressDotActive}` : styles.progressDot} />
          ))}
        </div>
      )}

      <div className={styles.card}>
        {step === 0 && (
          <>
            <span className={styles.eyebrow}>Before we start</span>
            <h1 className={styles.title}>What should we call you?</h1>
            <p className={styles.subtitle}>
              A few quick questions so the coaching starts from where you actually are, not a
              generic default. Nothing here is shared — it stays on this device.
            </p>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="ob-name">Name (optional)</label>
                <input
                  id="ob-name"
                  className={styles.input}
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
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
                      className={draft.ageRange === range ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                      onClick={() => setDraft((d) => ({ ...d, ageRange: range }))}
                      aria-pressed={draft.ageRange === range}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <span className={styles.eyebrow}>Priorities</span>
            <h1 className={styles.title}>What matters most right now?</h1>
            <p className={styles.subtitle}>Pick as many as apply — this decides what you see first on your dashboard.</p>
            <div className={styles.fields}>
              <div className={styles.optionGrid}>
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    className={draft.primaryGoals.includes(g.key) ? `${styles.option} ${styles.optionActive}` : styles.option}
                    onClick={() => toggleGoal(g.key)}
                    aria-pressed={draft.primaryGoals.includes(g.key)}
                  >
                    <div className={styles.optionLabel}>{g.label}</div>
                    <p className={styles.optionHint}>{g.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <span className={styles.eyebrow}>Sleep &amp; recovery</span>
            <h1 className={styles.title}>How much do you usually sleep?</h1>
            <div className={styles.fields}>
              <div className={styles.tagRow}>
                {SLEEP_HOURS_OPTIONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={draft.sleepHours === h ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                    onClick={() => setDraft((d) => ({ ...d, sleepHours: h }))}
                    aria-pressed={draft.sleepHours === h}
                  >
                    {h}
                  </button>
                ))}
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>What gets in the way most?</span>
                <div className={styles.tagRow}>
                  {SLEEP_COMPLAINT_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={draft.sleepComplaints.includes(tag) ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                      onClick={() => toggleComplaint(tag)}
                      aria-pressed={draft.sleepComplaints.includes(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <span className={styles.eyebrow}>Movement</span>
            <h1 className={styles.title}>How active is a typical week?</h1>
            <div className={styles.fields}>
              <div className={styles.optionGrid}>
                {ACTIVITY_LEVEL_OPTIONS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    className={draft.activityLevel === a.key ? `${styles.option} ${styles.optionActive}` : styles.option}
                    onClick={() => setDraft((d) => ({ ...d, activityLevel: a.key }))}
                    aria-pressed={draft.activityLevel === a.key}
                  >
                    <div className={styles.optionLabel}>{a.label}</div>
                  </button>
                ))}
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Preferred style</span>
                <div className={styles.tagRow}>
                  {WORKOUT_STYLE_OPTIONS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      className={draft.workoutStyle === w ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                      onClick={() => setDraft((d) => ({ ...d, workoutStyle: w }))}
                      aria-pressed={draft.workoutStyle === w}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <span className={styles.eyebrow}>Nutrition</span>
            <h1 className={styles.title}>What&apos;s your eating pattern like?</h1>
            <div className={styles.fields}>
              <div className={styles.optionGrid}>
                {NUTRITION_PATTERN_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={draft.nutritionPattern === n ? `${styles.option} ${styles.optionActive}` : styles.option}
                    onClick={() => setDraft((d) => ({ ...d, nutritionPattern: n }))}
                    aria-pressed={draft.nutritionPattern === n}
                  >
                    <div className={styles.optionLabel}>{n}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <span className={styles.eyebrow}>Mind &amp; purpose</span>
            <h1 className={styles.title}>How stressed has this stretch felt?</h1>
            <div className={styles.fields}>
              <div className={styles.field}>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={draft.stressLevel}
                  onChange={(e) => setDraft((d) => ({ ...d, stressLevel: Number(e.target.value) }))}
                  className={styles.slider}
                  aria-label="Stress level, 1 to 5"
                />
                <div className={styles.sliderLabels}>
                  <span>Calm</span>
                  <span>Overwhelmed</span>
                </div>
              </div>
            </div>
          </>
        )}

        {step === TOTAL_STEPS && (
          <>
            <div className={styles.doneIcon}>✓</div>
            <h1 className={styles.title}>Set. Let&apos;s see the curve.</h1>
            <p className={styles.subtitle}>
              Your dashboard is ordered around what you told us matters most — update any of this
              later just by living your week honestly.
            </p>
          </>
        )}

        <div className={styles.footer}>
          {step > 0 && step <= TOTAL_STEPS - 1 ? (
            <button type="button" className={styles.btn} onClick={back}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step < TOTAL_STEPS ? (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={next}>
              {step === TOTAL_STEPS - 1 ? "Review" : "Continue"}
            </button>
          ) : (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={finish}>
              Go to dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
