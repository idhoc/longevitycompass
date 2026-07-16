import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { TrajectoryScene } from "@/components/TrajectoryScene";
import styles from "./page.module.css";

const FIELD_NOTES = [
  {
    label: "Sleep",
    text: "A real check-in on bedtime, quality, and disruptors — plus a causal diagnostic that answers 'why am I tired' instead of just logging hours.",
  },
  {
    label: "Nutrition",
    text: "Photograph what you ate, or what's in your fridge — vision AI reacts to the actual food, not a description you typed from memory.",
  },
  {
    label: "Fitness",
    text: "Guided sessions paced by a timer or a tempo cue, tracked against a real weekly pattern — not just a static plan.",
  },
  {
    label: "Mind",
    text: "Daily reflection, guided meditation with a real spoken voice, and a timed nudge to step away from the screen.",
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <SiteNav active="/" />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className="eyebrow">Longevity Compass — field build 01</span>
          <h1 className={styles.headline}>
            Your habits already wrote a curve.
            <br />
            <em>This is where it bends.</em>
          </h1>
          <p className={styles.subhead}>
            One readiness score, four domains that each work a different way — a sleep
            diagnostic, photo-first nutrition, guided workouts, and real guided meditation —
            reshaped every day by what you actually did, not what you meant to do.
          </p>
          <div className={styles.actions}>
            <Link href="/dashboard" className={styles.ctaPrimary}>
              See your readiness
            </Link>
            <Link href="/coach" className={styles.ctaSecondary}>
              How the coaching works →
            </Link>
          </div>
        </div>
        <div className={styles.heroScene}>
          <TrajectoryScene reach={1} interactive colorStart="#8b8d7e" colorEnd="#3e6b4f" />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className="eyebrow">Domains</span>
          <h2>four domains, each built differently</h2>
        </div>
        <div className={styles.fieldNotes}>
          {FIELD_NOTES.map((note) => (
            <div className={styles.fieldNote} key={note.label}>
              <span className={styles.fieldNoteLabel}>{note.label}</span>
              <p className={styles.fieldNoteText}>{note.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className="eyebrow">Scope</span>
          <h2>coaching, not medicine</h2>
        </div>
        <p className={styles.scope}>
          Every recommendation here cites a real finding — a study, a sample size, a number —
          not a vibe. And every recommendation stays inside <strong>wellness coaching</strong>:
          symptoms, medications, and diagnoses get a referral to a licensed clinician, not a
          guess dressed up as advice. That line is enforced before either the research pass or
          the coaching pass ever runs, not left to the model&apos;s discretion.
        </p>
      </section>

      <footer className={styles.footer}>
        <span>Longevity Compass</span>
        <span className="tabular">Field build 01</span>
      </footer>
    </div>
  );
}
