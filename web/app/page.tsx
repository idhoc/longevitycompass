import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { TrajectoryScene } from "@/components/TrajectoryScene";
import styles from "./page.module.css";

const FIELD_NOTES = [
  {
    label: "Movement",
    text: "Resistance and daily movement, dosed to what your week actually allows — not a workout you'll skip.",
  },
  {
    label: "Nutrition",
    text: "The pattern you eat most days shapes cellular aging more than any single meal does.",
  },
  {
    label: "Mind",
    text: "Purpose and connection remain the most consistently replicated predictor of a longer life across population studies.",
  },
  {
    label: "Recovery",
    text: "Sleep, circadian timing, and mobility — the part of the curve that repairs, rather than just moves it forward.",
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
            A coaching plan drawn from published research on nutrition, movement, sleep, and
            mind — reshaped every week by what you actually did, not what you meant to do.
          </p>
          <div className={styles.actions}>
            <Link href="/dashboard" className={styles.ctaPrimary}>
              See your curve
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
          <h2>four areas, one curve</h2>
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
        <span className="tabular">Concept build — 3 screens</span>
      </footer>
    </div>
  );
}
