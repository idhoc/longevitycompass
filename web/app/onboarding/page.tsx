"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  EMPTY_PROFILE,
  GOAL_OPTIONS,
  SLEEP_HOURS_OPTIONS,
  SLEEP_COMPLAINT_OPTIONS,
  CAFFEINE_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  WORKOUT_STYLE_OPTIONS,
  NUTRITION_PATTERN_OPTIONS,
  DIETARY_OPTIONS,
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

const COMPASS_SIZE = 200;
const COMPASS_CENTER = COMPASS_SIZE / 2;
const COMPASS_RADIUS = 70;
const COMPASS_RING = 22;

function angleForGoalIndex(i: number) {
  return -90 + i * 90; // N, E, S, W — matches GOAL_OPTIONS order
}

/** The goal picker as an actual compass dial — tap or drag anywhere on
 * the ring to point the needle at what matters most. The four real
 * buttons underneath keep it fully reachable by keyboard/screen reader. */
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
              <circle r={19} fill={value === g.key ? "var(--signal)" : "var(--paper)"} stroke="var(--line-strong)" strokeWidth={1.5} />
              <text textAnchor="middle" dominantBaseline="central" fontSize="17">
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
  const [, setTourPending] = useLocalStorageState<boolean>("lc_tour_pending_v1", false);
  const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);

  function toggleMulti(field: "sleepComplaints" | "dietaryRestrictions", value: string) {
    setDraft((d) => {
      const list = d[field];
      return { ...d, [field]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  function skip() {
    setSkipped(true);
    router.push("/home");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setProfile({
      ...draft,
      ageRange: ageRangeFromExactAge(draft.exactAge),
      disclaimerAcknowledged: true,
      completedAt: new Date().toISOString(),
    });
    setTourPending(true);
    router.push("/home");
  }

  const sleepIndex = (SLEEP_HOURS_OPTIONS as readonly string[]).indexOf(draft.sleepHours);

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <span className={styles.mark}>Longevity Compass</span>
        <button type="button" className={styles.skip} onClick={skip}>
          Skip for now
        </button>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.intro}>
          <h1 className={styles.introTitle}>Set up your coach</h1>
          <p className={styles.introSub}>
            A few real questions about your goals, sleep, food, movement, and stress. Everything is
            optional — leave a field blank and it just won&apos;t be used. Takes about two minutes.
          </p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About you</h2>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="ob-name">Name (optional)</label>
            <input
              id="ob-name"
              className={styles.input}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="First name"
              autoComplete="given-name"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="ob-age">Age</label>
              <input
                id="ob-age"
                className={styles.input}
                type="number"
                min={13}
                max={110}
                inputMode="numeric"
                value={draft.exactAge ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, exactAge: e.target.value ? Number(e.target.value) : null }))}
                placeholder="Years"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Units</span>
              <div className={styles.chipRow}>
                {(["imperial", "metric"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={draft.units === u ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                    onClick={() => setDraft((d) => ({ ...d, units: u }))}
                    aria-pressed={draft.units === u}
                  >
                    {u === "imperial" ? "lb / ft-in" : "kg / cm"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Sex</span>
            <div className={styles.chipRow}>
              {SEX_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={draft.sex === s ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => setDraft((d) => ({ ...d, sex: s }))}
                  aria-pressed={draft.sex === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {draft.units === "metric" ? (
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="ob-height-cm">Height (cm)</label>
                <input
                  id="ob-height-cm"
                  className={styles.input}
                  type="number"
                  min={100}
                  max={250}
                  value={draft.heightCm != null ? Math.round(draft.heightCm) : ""}
                  onChange={(e) => setDraft((d) => ({ ...d, heightCm: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="cm"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="ob-weight-kg">Weight (kg)</label>
                <input
                  id="ob-weight-kg"
                  className={styles.input}
                  type="number"
                  min={30}
                  max={300}
                  value={draft.weightKg != null ? Math.round(draft.weightKg) : ""}
                  onChange={(e) => setDraft((d) => ({ ...d, weightKg: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="kg"
                />
              </div>
            </div>
          ) : (
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Height</span>
                <div className={styles.fieldRow}>
                  <input
                    className={styles.input}
                    type="number"
                    min={3}
                    max={8}
                    value={draft.heightCm != null ? cmToFtIn(draft.heightCm).feet : ""}
                    onChange={(e) => {
                      const feet = Number(e.target.value) || 0;
                      const inches = draft.heightCm != null ? cmToFtIn(draft.heightCm).inches : 0;
                      setDraft((d) => ({ ...d, heightCm: e.target.value ? ftInToCm(feet, inches) : null }));
                    }}
                    placeholder="ft"
                  />
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={11}
                    value={draft.heightCm != null ? cmToFtIn(draft.heightCm).inches : ""}
                    onChange={(e) => {
                      const inches = Number(e.target.value) || 0;
                      const feet = draft.heightCm != null ? cmToFtIn(draft.heightCm).feet : Math.floor(cmToFtIn(170).feet);
                      setDraft((d) => ({ ...d, heightCm: ftInToCm(feet, inches) }));
                    }}
                    placeholder="in"
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="ob-weight-lb">Weight (lb)</label>
                <input
                  id="ob-weight-lb"
                  className={styles.input}
                  type="number"
                  min={60}
                  max={600}
                  value={draft.weightKg != null ? Math.round(kgToLb(draft.weightKg)) : ""}
                  onChange={(e) => setDraft((d) => ({ ...d, weightKg: e.target.value ? lbToKg(Number(e.target.value)) : null }))}
                  placeholder="lb"
                />
              </div>
            </div>
          )}
          <p className={styles.sectionHint}>Shapes what&apos;s normal for you — resting heart rate, protein needs, training load — instead of a generic default.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What matters most right now</h2>
          <GoalCompass value={draft.primaryGoals[0] ?? null} onChange={(key) => setDraft((d) => ({ ...d, primaryGoals: [key] }))} />
          {draft.primaryGoals[0] && (
            <p className={styles.sectionHint}>{GOAL_OPTIONS.find((g) => g.key === draft.primaryGoals[0])?.hint}</p>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Sleep</h2>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Usual hours a night</label>
            <input
              type="range"
              min={0}
              max={SLEEP_HOURS_OPTIONS.length - 1}
              step={1}
              value={sleepIndex === -1 ? 2 : sleepIndex}
              onChange={(e) => setDraft((d) => ({ ...d, sleepHours: SLEEP_HOURS_OPTIONS[Number(e.target.value)] }))}
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
            <span className={styles.fieldLabel}>What gets in the way, if anything</span>
            <div className={styles.chipRow}>
              {SLEEP_COMPLAINT_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={draft.sleepComplaints.includes(c) ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => toggleMulti("sleepComplaints", c)}
                  aria-pressed={draft.sleepComplaints.includes(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Caffeine, typical day</span>
            <div className={styles.chipRow}>
              {CAFFEINE_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={draft.caffeineHabit === c ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => setDraft((d) => ({ ...d, caffeineHabit: c }))}
                  aria-pressed={draft.caffeineHabit === c}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Activity</h2>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Current activity level</span>
            <div className={styles.chipRow}>
              {ACTIVITY_LEVEL_OPTIONS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={draft.activityLevel === a.key ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => setDraft((d) => ({ ...d, activityLevel: a.key }))}
                  aria-pressed={draft.activityLevel === a.key}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Movement you enjoy</span>
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

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="ob-injuries">Anything to work around (optional)</label>
            <input
              id="ob-injuries"
              className={styles.input}
              value={draft.injuries}
              onChange={(e) => setDraft((d) => ({ ...d, injuries: e.target.value }))}
              placeholder="e.g. bad left knee"
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Nutrition</h2>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>How you eat day to day</span>
            <div className={styles.chipRow}>
              {NUTRITION_PATTERN_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={draft.nutritionPattern === n ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => setDraft((d) => ({ ...d, nutritionPattern: n }))}
                  aria-pressed={draft.nutritionPattern === n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Dietary restrictions</span>
            <div className={styles.chipRow}>
              {DIETARY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={draft.dietaryRestrictions.includes(d) ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => toggleMulti("dietaryRestrictions", d)}
                  aria-pressed={draft.dietaryRestrictions.includes(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Stress</h2>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Level lately, 1 to 5</label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={draft.stressLevel}
              onChange={(e) => setDraft((d) => ({ ...d, stressLevel: Number(e.target.value) }))}
              className={styles.slider}
              aria-label="Stress level, 1 to 5"
            />
            <div className={styles.sliderLabels} aria-hidden="true">
              <span>Calm</span>
              <span>High</span>
            </div>
            <p className={styles.sliderValue}>{draft.stressLevel} / 5</p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Anything else? (optional)</h2>
          <div className={styles.field}>
            <textarea
              className={styles.input}
              rows={3}
              value={draft.onboardingNotes[0] ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, onboardingNotes: e.target.value ? [e.target.value] : [] }))
              }
              placeholder="Anything about your situation that doesn't fit the questions above — this gets fed to the Coach as real context, word for word."
            />
          </div>
        </section>

        <div className={styles.formFooter}>
          <p className={styles.fineprint}>
            This app offers friendly coaching, not medical advice — it&apos;ll always say so plainly
            if something needs a real doctor. Everything you enter here stays on this device; see{" "}
            <Link href="/privacy" className={styles.fineprintLink}>what leaves it and when</Link>.
          </p>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBig}`}>
            Finish setup
          </button>
        </div>
      </form>
    </div>
  );
}
