"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  EMPTY_PROFILE,
  GOAL_OPTIONS,
  SLEEP_HOURS_OPTIONS,
  SLEEP_COMPLAINT_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  WORKOUT_STYLE_OPTIONS,
  NUTRITION_PATTERN_OPTIONS,
  TONE_OPTIONS,
  INTENSITY_OPTIONS,
  domainPlanFromProfile,
  type UserProfile,
  type DomainKey,
} from "@/lib/profile";
import styles from "./page.module.css";

// Input steps only — the welcome burst (0) and the final plan reveal
// (TOTAL_STEPS) sit outside this count.
const TOTAL_STEPS = 9;

const DOMAIN_LABEL: Record<DomainKey, string> = {
  sleep: "Sleep & Recovery",
  nutrition: "Nutrition",
  fitness: "Fitness & Movement",
  mind: "Mind & Purpose",
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0, scale: 0.98 }),
};

const shardAngles = Array.from({ length: 10 }, (_, i) => (i / 10) * 360);

function WelcomeBurst() {
  return (
    <div className={styles.burstWrap} aria-hidden="true">
      {shardAngles.map((angle, i) => (
        <motion.span
          key={i}
          className={styles.shard}
          initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
          animate={{
            x: Math.cos((angle * Math.PI) / 180) * 130,
            y: Math.sin((angle * Math.PI) / 180) * 130,
            opacity: 0,
            scale: 0.3,
          }}
          transition={{ duration: 1.1, delay: 0.15 + i * 0.02, ease: "easeOut" }}
        />
      ))}
      <motion.span
        className={styles.burstMark}
        initial={{ scale: 2.4, opacity: 0, filter: "blur(14px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        LC<span className={styles.markDot}>·</span>01
      </motion.span>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [, setProfile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [, setSkipped] = useLocalStorageState<boolean>("lc_onboarding_skipped_v1", false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
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
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function back() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function skip() {
    setSkipped(true);
    router.push("/today");
  }

  function finish() {
    setProfile({ ...draft, completedAt: new Date().toISOString() });
    router.push("/today");
  }

  const plan = domainPlanFromProfile(draft);
  const domainOrder: DomainKey[] =
    draft.primaryGoals.length > 0
      ? [...draft.primaryGoals, ...(["sleep", "nutrition", "fitness", "mind"] as DomainKey[]).filter((k) => !draft.primaryGoals.includes(k))]
      : ["sleep", "nutrition", "fitness", "mind"];

  const showChrome = step > 0 && step < TOTAL_STEPS;
  const canContinueFromDisclaimer = step !== 8 || draft.disclaimerAcknowledged;

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <span className={styles.mark}>
          LC<span className={styles.markDot}>·</span>01
        </span>
        {showChrome && (
          <button type="button" className={styles.skip} onClick={skip}>
            Skip for now
          </button>
        )}
      </div>

      {showChrome && (
        <div className={styles.progress} role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS - 1}>
          {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
            <div key={i} className={i <= step - 1 ? `${styles.progressDot} ${styles.progressDotActive}` : styles.progressDot} />
          ))}
        </div>
      )}

      <div className={styles.card}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <div className={styles.welcome}>
                <WelcomeBurst />
                <h1 className={styles.title} style={{ textAlign: "center" }}>
                  A coach that actually reads what you log.
                </h1>
                <p className={styles.subtitle} style={{ textAlign: "center", margin: "var(--space-3) auto 0" }}>
                  A few honest questions first — how you talk to yourself, what&apos;s off-limits, and
                  where you actually are. Nothing here leaves this device.
                </p>
                <div className={styles.footer} style={{ justifyContent: "center", marginTop: "var(--space-6)" }}>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={next}>
                    Begin
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <>
                <span className={styles.eyebrow}>Before we start</span>
                <h1 className={styles.title}>What should we call you?</h1>
                <p className={styles.subtitle}>
                  A few quick questions so the coaching starts from where you actually are, not a
                  generic default.
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

            {step === 2 && (
              <>
                <span className={styles.eyebrow}>Priorities</span>
                <h1 className={styles.title}>What matters most right now?</h1>
                <p className={styles.subtitle}>Pick as many as apply — this decides what you see first.</p>
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

            {step === 3 && (
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

            {step === 4 && (
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

            {step === 5 && (
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

            {step === 6 && (
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

            {step === 7 && (
              <>
                <span className={styles.eyebrow}>How it talks to you</span>
                <h1 className={styles.title}>Pick a tone that fits you.</h1>
                <p className={styles.subtitle}>Change this anytime in Settings.</p>
                <div className={styles.fields}>
                  <div className={styles.optionGrid}>
                    {TONE_OPTIONS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        className={draft.tone === t.key ? `${styles.option} ${styles.optionActive}` : styles.option}
                        onClick={() => setDraft((d) => ({ ...d, tone: t.key }))}
                        aria-pressed={draft.tone === t.key}
                      >
                        <div className={styles.optionLabel}>{t.label}</div>
                        <p className={styles.optionHint}>{t.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 8 && (
              <>
                <span className={styles.eyebrow}>Before you continue</span>
                <h1 className={styles.title}>How direct should it be?</h1>
                <div className={styles.fields}>
                  <div className={styles.optionGrid}>
                    {INTENSITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={draft.intensity === opt.key ? `${styles.option} ${styles.optionActive}` : styles.option}
                        onClick={() => setDraft((d) => ({ ...d, intensity: opt.key }))}
                        aria-pressed={draft.intensity === opt.key}
                      >
                        <div className={styles.optionLabel}>{opt.label}</div>
                        <p className={styles.optionHint}>{opt.hint}</p>
                      </button>
                    ))}
                  </div>
                  <div className={styles.disclaimer}>
                    <p>
                      Longevity Compass is a wellness coach, not a clinician. It never diagnoses,
                      never adjusts medication, and will tell you plainly — and stop — the moment
                      something needs a real doctor or emergency services instead of a guess.
                      Everything you log stays on this device.
                    </p>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={draft.disclaimerAcknowledged}
                        onChange={(e) => setDraft((d) => ({ ...d, disclaimerAcknowledged: e.target.checked }))}
                      />
                      <span>I understand this is coaching, not medical advice.</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {step === TOTAL_STEPS && (
              <div className={styles.reveal}>
                <div className={styles.doneIcon}>✓</div>
                <h1 className={styles.title}>
                  {draft.name ? `Here's your plan, ${draft.name}.` : "Here's your plan."}
                </h1>
                <p className={styles.subtitle}>
                  Built from what you just told us — it reorders and reshapes itself as you log
                  real days.
                </p>
                <div className={styles.planGrid}>
                  {domainOrder.map((key, i) => (
                    <motion.div
                      key={key}
                      className={styles.planCard}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + i * 0.09, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <span className={styles.planLabel}>{DOMAIN_LABEL[key]}</span>
                      <p className={styles.planText}>{plan[key]}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step > 0 && (
          <div className={styles.footer}>
            {step <= TOTAL_STEPS - 1 ? (
              <button type="button" className={styles.btn} onClick={back}>
                Back
              </button>
            ) : (
              <span />
            )}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={next}
                disabled={!canContinueFromDisclaimer}
              >
                {step === TOTAL_STEPS - 1 ? "See my plan" : "Continue"}
              </button>
            ) : (
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={finish}>
                Start today
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
