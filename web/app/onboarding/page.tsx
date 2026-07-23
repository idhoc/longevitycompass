"use client";

import { useEffect, useState } from "react";
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

const STEP_TITLES = ["About you", "What matters most", "Sleep", "Activity", "Nutrition", "Stress", "Anything else"];

/** Four real choices don't need a dial — tap a card to add it to your
 * priority order, tap it again to drop it. The number badge is the only
 * thing standing in for rank, so it stays obvious without a legend. */
function GoalPicker({ value, onChange }: { value: DomainKey[]; onChange: (next: DomainKey[]) => void }) {
  function toggle(key: DomainKey) {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  }

  return (
    <div className={styles.goalGrid} role="group" aria-label="What matters most, in priority order">
      {GOAL_OPTIONS.map((g) => {
        const rank = value.indexOf(g.key);
        const selected = rank !== -1;
        return (
          <button
            key={g.key}
            type="button"
            className={selected ? `${styles.goalCard} ${styles.goalCardActive}` : styles.goalCard}
            onClick={() => toggle(g.key)}
            aria-pressed={selected}
          >
            {selected && <span className={styles.goalRank}>{rank + 1}</span>}
            <span className={styles.goalIcon} aria-hidden="true">{g.icon}</span>
            <span className={styles.goalLabel}>{g.label}</span>
            <span className={styles.goalHint}>{g.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A visual stand-in for a free-text box: existing entries show as
 * removable chips, and adding one more is another chip away instead of
 * a blank paragraph field inviting an essay. */
function TagComposer({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draftText, setDraftText] = useState("");

  function commit() {
    const value = draftText.trim();
    if (value) onAdd(value);
    setDraftText("");
    setAdding(false);
  }

  return (
    <div className={styles.chipRow}>
      {tags.map((tag, i) => (
        <span key={`${tag}-${i}`} className={styles.tagChip}>
          {tag}
          <button
            type="button"
            className={styles.tagChipRemove}
            onClick={() => onRemove(i)}
            aria-label={`Remove "${tag}"`}
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          className={styles.tagInput}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setDraftText("");
              setAdding(false);
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
        />
      ) : (
        <button type="button" className={styles.tagAddChip} onClick={() => setAdding(true)}>
          + Add
        </button>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [, setProfile] = useLocalStorageState<UserProfile | null>("lc_profile_v1", null);
  const [, setSkipped] = useLocalStorageState<boolean>("lc_onboarding_skipped_v1", false);
  const [, setTourPending] = useLocalStorageState<boolean>("lc_tour_pending_v1", false);
  const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);
  const [step, setStep] = useState(0);
  const lastStep = STEP_TITLES.length - 1;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  function toggleMulti(field: "sleepComplaints" | "dietaryRestrictions", value: string) {
    setDraft((d) => {
      const list = d[field];
      return { ...d, [field]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  function addNote(value: string) {
    setDraft((d) => ({ ...d, onboardingNotes: [...d.onboardingNotes, value] }));
  }

  function removeNote(index: number) {
    setDraft((d) => ({ ...d, onboardingNotes: d.onboardingNotes.filter((_, i) => i !== index) }));
  }

  function skip() {
    setSkipped(true);
    router.push("/home");
  }

  function handleStepSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < lastStep) {
      setStep((s) => s + 1);
      return;
    }
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

      <div className={styles.stepDots} role="tablist" aria-label="Setup steps">
        {STEP_TITLES.map((title, i) => (
          <button
            key={title}
            type="button"
            role="tab"
            aria-selected={step === i}
            aria-label={`Step ${i + 1}: ${title}`}
            className={
              i === step
                ? `${styles.stepDot} ${styles.stepDotActive}`
                : i < step
                  ? `${styles.stepDot} ${styles.stepDotDone}`
                  : styles.stepDot
            }
            onClick={() => setStep(i)}
          />
        ))}
      </div>
      <p className={styles.stepLabel}>
        Step {step + 1} of {STEP_TITLES.length} · {STEP_TITLES[step]}
      </p>

      <form className={styles.form} onSubmit={handleStepSubmit}>
        {step === 0 && (
          <div className={styles.intro}>
            <h1 className={styles.introTitle}>Set up your coach</h1>
            <p className={styles.introSub}>
              A few real questions about your goals, sleep, food, movement, and stress. Everything is
              optional — leave a field blank and it just won&apos;t be used. Takes about two minutes.
            </p>
          </div>
        )}

        {step === 0 && (
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
        )}

        {step === 1 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>What matters most right now</h2>
            <p className={styles.sectionHint}>Tap what matters most — tap more than one and they&apos;ll rank in the order you pick them.</p>
            <GoalPicker value={draft.primaryGoals} onChange={(next) => setDraft((d) => ({ ...d, primaryGoals: next }))} />
            {draft.primaryGoals.length > 0 && (
              <p className={styles.sectionHint}>
                Priority order: {draft.primaryGoals.map((k) => GOAL_OPTIONS.find((g) => g.key === k)?.label).join(" → ")}
              </p>
            )}
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Anything else that matters to you? (optional)</span>
              <TagComposer
                tags={draft.onboardingNotes}
                onAdd={addNote}
                onRemove={removeNote}
                placeholder="Type it and press Enter"
              />
            </div>
          </section>
        )}

        {step === 2 && (
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
        )}

        {step === 3 && (
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
        )}

        {step === 4 && (
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
        )}

        {step === 5 && (
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
        )}

        {step === 6 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Anything else? (optional)</h2>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Fed to the Coach as real context, word for word</span>
              <TagComposer
                tags={draft.onboardingNotes}
                onAdd={addNote}
                onRemove={removeNote}
                placeholder="Type it and press Enter"
              />
            </div>
          </section>
        )}

        <div className={styles.stepNav}>
          {step > 0 && (
            <button type="button" className={styles.btn} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              ← Back
            </button>
          )}
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary} ${step === lastStep ? styles.btnBig : ""}`}>
            {step === lastStep ? "Finish setup" : "Next →"}
          </button>
        </div>

        {step === lastStep && (
          <div className={styles.formFooter}>
            <p className={styles.fineprint}>
              This app offers friendly coaching, not medical advice — it&apos;ll always say so plainly
              if something needs a real doctor. Everything you enter here stays on this device; see{" "}
              <Link href="/privacy" className={styles.fineprintLink}>what leaves it and when</Link>.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
