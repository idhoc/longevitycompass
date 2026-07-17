"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { Orb } from "@/components/Orb";
import { RoutineCompass } from "@/components/RoutineCompass";
import { dateKeyOffset, type DomainDayReach } from "@/lib/domainReach";
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

const COMPASS_SIZE = 220;
const COMPASS_CENTER = COMPASS_SIZE / 2;
const COMPASS_RADIUS = 78;
const COMPASS_RING = 24;

function angleForGoalIndex(i: number) {
  return -90 + i * 90; // N, E, S, W — matches GOAL_OPTIONS order
}

/** The goal picker, reimagined as an actual compass — tap or drag
 * anywhere on the dial to point the needle at what matters most, instead
 * of picking from a grid of buttons. The four real buttons underneath
 * keep it fully reachable by keyboard and screen reader. */
function GoalCompass({ value, onChange }: { value: DomainKey | null; onChange: (key: DomainKey) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const activeIndex = GOAL_OPTIONS.findIndex((g) => g.key === value);
  const needleAngle = activeIndex >= 0 ? angleForGoalIndex(activeIndex) : -90;

  function selectFromPoint(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    const idx = Math.round(deg / 90) % 4;
    onChange(GOAL_OPTIONS[idx].key);
  }

  return (
    <div className={styles.compassWrap}>
      <svg
        ref={svgRef}
        width={COMPASS_SIZE}
        height={COMPASS_SIZE}
        viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`}
        className={styles.compassSvg}
        aria-hidden="true"
        onPointerDown={(e) => {
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          selectFromPoint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging) selectFromPoint(e.clientX, e.clientY);
        }}
        onPointerUp={() => setDragging(false)}
      >
        <circle cx={COMPASS_CENTER} cy={COMPASS_CENTER} r={COMPASS_RADIUS + COMPASS_RING} fill="var(--paper-raised)" stroke="var(--line-strong)" strokeWidth={2} />
        <circle cx={COMPASS_CENTER} cy={COMPASS_CENTER} r={COMPASS_RADIUS - 10} fill="none" stroke="var(--line)" strokeDasharray="2 6" />
        <line
          x1={COMPASS_CENTER}
          y1={COMPASS_CENTER}
          x2={COMPASS_CENTER + COMPASS_RADIUS * Math.cos((needleAngle * Math.PI) / 180)}
          y2={COMPASS_CENTER + COMPASS_RADIUS * Math.sin((needleAngle * Math.PI) / 180)}
          stroke="var(--signal)"
          strokeWidth={3}
          strokeLinecap="round"
          style={{ transition: dragging ? "none" : "all 0.4s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <circle cx={COMPASS_CENTER} cy={COMPASS_CENTER} r={5} fill="var(--ink)" />
        {GOAL_OPTIONS.map((g, i) => {
          const a = angleForGoalIndex(i);
          const x = COMPASS_CENTER + (COMPASS_RADIUS + COMPASS_RING) * Math.cos((a * Math.PI) / 180);
          const y = COMPASS_CENTER + (COMPASS_RADIUS + COMPASS_RING) * Math.sin((a * Math.PI) / 180);
          return (
            <g key={g.key} transform={`translate(${x} ${y})`}>
              <circle r={20} fill={value === g.key ? "var(--signal)" : "var(--paper)"} stroke="var(--line-strong)" strokeWidth={1.5} />
              <text textAnchor="middle" dominantBaseline="central" fontSize="18">
                {g.icon}
              </text>
            </g>
          );
        })}
      </svg>

      <div className={styles.compassButtons} role="radiogroup" aria-label="Primary goal">
        {GOAL_OPTIONS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="radio"
            aria-checked={value === g.key}
            className={value === g.key ? `${styles.compassButton} ${styles.compassButtonActive}` : styles.compassButton}
            onClick={() => onChange(g.key)}
          >
            <span aria-hidden="true">{g.icon}</span> {g.label}
          </button>
        ))}
      </div>
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
  const [openHotspot, setOpenHotspot] = useState<"compass" | "tiles" | null>(null);

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
  const sleepIndex = (SLEEP_HOURS_OPTIONS as readonly string[]).indexOf(draft.sleepHours);
  const previewDays: DomainDayReach[] = Array.from({ length: 7 }, (_, i) => ({
    date: dateKeyOffset(6 - i),
    sleep: 0,
    nutrition: 0,
    fitness: 0,
    mind: 0,
  }));

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

      <span className={styles.srOnly} role="status">
        Step {step + 1} of {TOTAL_STEPS}
      </span>

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
                <span className={styles.eyebrow}>Where to point first</span>
                <h1 className={styles.title}>What matters most to you right now?</h1>
                <p className={styles.subtitle}>
                  Drag the needle, or tap a point on the dial — you can explore everything else
                  whenever you&apos;re ready.
                </p>
                <GoalCompass value={draft.primaryGoals[0] ?? null} onChange={chooseGoal} />
                {draft.primaryGoals[0] && (
                  <p className={styles.compassHint}>
                    {GOAL_OPTIONS.find((g) => g.key === draft.primaryGoals[0])?.hint}
                  </p>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <span className={styles.eyebrow}>A couple quick things</span>
                <h1 className={styles.title}>Let&apos;s fit this to your life</h1>
                <p className={styles.subtitle}>
                  This shapes a real plan for you, instead of a one-size-fits-all one.
                </p>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>How much sleep do you usually get?</span>
                  <input
                    type="range"
                    min={0}
                    max={SLEEP_HOURS_OPTIONS.length - 1}
                    step={1}
                    value={sleepIndex === -1 ? 2 : sleepIndex}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, sleepHours: SLEEP_HOURS_OPTIONS[Number(e.target.value)] }))
                    }
                    className={styles.slider}
                    aria-label="How much sleep do you usually get"
                  />
                  <div className={styles.sliderLabels} aria-hidden="true">
                    {SLEEP_HOURS_OPTIONS.map((h) => (
                      <span key={h}>{h}</span>
                    ))}
                  </div>
                  <p className={styles.sliderValue}>{draft.sleepHours || SLEEP_HOURS_OPTIONS[2]}</p>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>What kind of movement do you enjoy?</span>
                  <div className={styles.swipeStrip}>
                    {WORKOUT_STYLE_OPTIONS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        className={draft.workoutStyle === w ? `${styles.swipeCard} ${styles.swipeCardActive}` : styles.swipeCard}
                        onClick={() => setDraft((d) => ({ ...d, workoutStyle: w }))}
                        aria-pressed={draft.workoutStyle === w}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <p className={styles.swipeHint}>Swipe to see all options →</p>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <span className={styles.eyebrow}>Your actual dashboard</span>
                <h1 className={styles.title}>Here&apos;s where it all lives</h1>
                <p className={styles.subtitle}>
                  This is the real compass from Home, blank because nothing&apos;s logged yet — tap
                  it, or the domains below, to see what they do.
                </p>
                <div className={styles.tourPreview}>
                  <button
                    type="button"
                    className={styles.tourHotspot}
                    onClick={() => setOpenHotspot((h) => (h === "compass" ? null : "compass"))}
                    aria-expanded={openHotspot === "compass"}
                  >
                    <RoutineCompass days={previewDays} centerLabel="This week" centerValue="—" />
                  </button>
                  {openHotspot === "compass" && (
                    <p className={styles.tourCallout}>
                      Every ring is a domain — sleep, nutrition, fitness, mind. Every wedge is a
                      day. Log something and it fills in for real; today always sits on top.
                    </p>
                  )}

                  <div className={styles.tourTileRow} role="group" aria-label="Domains">
                    {(["nutrition", "fitness", "mind"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={styles.tourHotspotTile}
                        style={{ borderColor: `var(--${d})` }}
                        onClick={() => setOpenHotspot((h) => (h === "tiles" ? null : "tiles"))}
                        aria-expanded={openHotspot === "tiles"}
                      >
                        {d === "nutrition" ? "Nutrition" : d === "fitness" ? "Fitness" : "Mind"}
                      </button>
                    ))}
                  </div>
                  {openHotspot === "tiles" && (
                    <p className={styles.tourCallout}>
                      Tap any domain on Home to log something or dig in — guided workouts, meal
                      photos, guided meditation, sleep tracking, all one tap deep.
                    </p>
                  )}
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
