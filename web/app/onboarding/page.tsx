"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { Orb } from "@/components/Orb";
import {
  EMPTY_PROFILE,
  GOAL_OPTIONS,
  SLEEP_HOURS_OPTIONS,
  WORKOUT_STYLE_OPTIONS,
  domainPlanFromProfile,
  type UserProfile,
  type DomainKey,
} from "@/lib/profile";
import styles from "./page.module.css";

const TOTAL_STEPS = 5; // Welcome, Goal, Setup, Tour, Action

const ACTION_COPY: Record<
  DomainKey | "none",
  { title: string; body: string; cta: string; href: string }
> = {
  sleep: {
    title: "Let's start with last night",
    body: "One honest check-in on how you slept is all it takes to get going.",
    cta: "Log last night's sleep",
    href: "/recovery",
  },
  nutrition: {
    title: "Let's see what's actually on your plate",
    body: "Photograph your next meal instead of describing it — that's the whole first step.",
    cta: "Log a meal",
    href: "/nutrition",
  },
  fitness: {
    title: "Let's ease in",
    body: "A short, guided session — no equipment, no pressure to go hard.",
    cta: "Start a quick session",
    href: "/fitness",
  },
  mind: {
    title: "Let's take one mindful breath",
    body: "Follow the glow for a few seconds — in as it grows, out as it settles.",
    cta: "Continue to Home",
    href: "/home",
  },
  none: {
    title: "You're all set",
    body: "Explore at your own pace — every screen is ready when you are.",
    cta: "Go to Home",
    href: "/home",
  },
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

function BloomMark() {
  const dots = Array.from({ length: 8 }, (_, i) => (i / 8) * 360);
  return (
    <div className={styles.bloomWrap} aria-hidden="true">
      {dots.map((angle, i) => (
        <motion.span
          key={i}
          className={styles.bloomDot}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{
            x: Math.cos((angle * Math.PI) / 180) * 46,
            y: Math.sin((angle * Math.PI) / 180) * 46,
            opacity: 0.8,
            scale: 1,
          }}
          transition={{ duration: 1, delay: 0.1 + i * 0.04, ease: "easeOut" }}
        />
      ))}
      <motion.span
        className={styles.bloomMark}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        LC
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

  function next() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function back() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function skip() {
    setSkipped(true);
    router.push("/home");
  }

  function chooseGoal(key: DomainKey) {
    setDraft((d) => ({ ...d, primaryGoals: [key] }));
  }

  function finishAndGo(href: string) {
    setProfile({ ...draft, disclaimerAcknowledged: true, completedAt: new Date().toISOString() });
    router.push(href);
  }

  const chosenGoal: DomainKey | "none" = draft.primaryGoals.length > 0 ? draft.primaryGoals[0] : "none";
  const action = ACTION_COPY[chosenGoal];
  const goalLabel = GOAL_OPTIONS.find((g) => g.key === chosenGoal)?.label;
  const plan = domainPlanFromProfile(draft);

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <span className={styles.mark}>Longevity Compass</span>
        {step > 0 && (
          <button type="button" className={styles.skip} onClick={skip}>
            Skip for now
          </button>
        )}
      </div>

      {step > 0 && (
        <div
          className={styles.progress}
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={i <= step ? `${styles.progressDot} ${styles.progressDotActive}` : styles.progressDot} />
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
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <div className={styles.welcome}>
                <BloomMark />
                <h1 className={styles.title}>Welcome to Longevity Compass</h1>
                <p className={styles.subtitle}>
                  We&apos;re here to help you live a longer, healthier life — one small, doable
                  step at a time. No overwhelm, no jargon, just what actually helps.
                </p>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="ob-name">
                    What should we call you? (optional)
                  </label>
                  <input
                    id="ob-name"
                    className={styles.input}
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </div>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBig}`} onClick={next}>
                  Let&apos;s begin
                </button>
                <p className={styles.fineprint}>
                  This app offers friendly coaching, not medical advice — it&apos;ll always say so
                  plainly if something needs a real doctor.
                </p>
              </div>
            )}

            {step === 1 && (
              <>
                <span className={styles.eyebrow}>Step 1 of {TOTAL_STEPS}</span>
                <h1 className={styles.title}>What matters most to you right now?</h1>
                <p className={styles.subtitle}>
                  Pick one to start — you can explore everything else whenever you&apos;re ready.
                </p>
                <div className={styles.goalGrid} role="radiogroup" aria-label="Primary goal">
                  {GOAL_OPTIONS.map((g) => (
                    <label
                      key={g.key}
                      className={draft.primaryGoals[0] === g.key ? `${styles.goalCard} ${styles.goalCardActive}` : styles.goalCard}
                    >
                      <input
                        type="radio"
                        name="goal"
                        className={styles.srOnly}
                        checked={draft.primaryGoals[0] === g.key}
                        onChange={() => chooseGoal(g.key)}
                      />
                      <span className={styles.goalIcon} aria-hidden="true">{g.icon}</span>
                      <span className={styles.goalLabel}>{g.label}</span>
                      <span className={styles.goalHint}>{g.hint}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <span className={styles.eyebrow}>Step 2 of {TOTAL_STEPS}</span>
                <h1 className={styles.title}>A couple of quick questions</h1>
                <p className={styles.subtitle}>
                  This helps things fit your life, instead of giving you a one-size-fits-all plan.
                </p>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>How much sleep do you usually get?</span>
                  <div className={styles.chipRow}>
                    {SLEEP_HOURS_OPTIONS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={draft.sleepHours === h ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                        onClick={() => setDraft((d) => ({ ...d, sleepHours: h }))}
                        aria-pressed={draft.sleepHours === h}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>What kind of movement do you enjoy?</span>
                  <div className={styles.chipRow}>
                    {WORKOUT_STYLE_OPTIONS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        className={draft.workoutStyle === w ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                        onClick={() => setDraft((d) => ({ ...d, workoutStyle: w }))}
                        aria-pressed={draft.workoutStyle === w}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <span className={styles.eyebrow}>Step 3 of {TOTAL_STEPS}</span>
                <h1 className={styles.title}>Here&apos;s your Home screen</h1>
                <p className={styles.subtitle}>
                  Check in here once a day — everything else branches out from this one screen.
                </p>
                <div className={styles.tourPreview} aria-hidden="true">
                  <div className={styles.tourDials}>
                    <span className={styles.tourDial} style={{ borderColor: "var(--signal)" }} />
                    <span className={styles.tourDial} style={{ borderColor: "var(--recovery-high)" }} />
                    <span className={styles.tourDial} style={{ borderColor: "var(--strain)" }} />
                  </div>
                  <div className={styles.tourCallout}>Your daily numbers, in one glance</div>
                  <div className={styles.tourTiles}>
                    <span className={styles.tourTile} style={{ background: "var(--nutrition-wash)", borderColor: "var(--nutrition)" }} />
                    <span className={styles.tourTile} style={{ background: "var(--fitness-wash)", borderColor: "var(--fitness)" }} />
                    <span className={styles.tourTile} style={{ background: "var(--mind-wash)", borderColor: "var(--mind)" }} />
                  </div>
                  <div className={styles.tourCallout}>Tap any card to log or learn more</div>
                </div>
              </>
            )}

            {step === 4 && (
              <div className={styles.actionStep}>
                {chosenGoal === "mind" ? (
                  <div className={styles.orbMoment}>
                    <Orb state="idle" size={140} color="var(--mind)" />
                  </div>
                ) : (
                  <div className={styles.doneIcon}>✓</div>
                )}
                <h1 className={styles.title}>
                  {draft.name ? `${action.title}, ${draft.name}.` : `${action.title}.`}
                </h1>
                {goalLabel && chosenGoal !== "none" && (
                  <p className={styles.planLine}>{plan[chosenGoal as DomainKey]}</p>
                )}
                <p className={styles.subtitle}>{action.body}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step > 0 && (
          <div className={styles.footer}>
            <button type="button" className={styles.btn} onClick={back}>
              Back
            </button>
            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={next}
                disabled={step === 1 && draft.primaryGoals.length === 0}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBig}`}
                onClick={() => finishAndGo(action.href)}
              >
                {action.cta}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
