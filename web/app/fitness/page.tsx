import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { WORKOUTS } from "@/lib/workouts";
import styles from "./page.module.css";

export default function FitnessLibraryPage() {
  return (
    <div className={styles.page}>
      <SiteNav active="/fitness" />

      <div className={styles.header}>
        <span className="eyebrow">Guided sessions</span>
        <h1>Pick a session</h1>
        <p className={styles.headerSub}>
          Step-by-step, paced by a timer or a tempo cue — no equipment, no video needed.
          Finishing one marks today done on your weekly tracker.
        </p>
      </div>

      <div className={styles.grid}>
        {WORKOUTS.map((w) => (
          <div className={styles.card} key={w.id}>
            <div className={styles.cardTop}>
              <span className={styles.cardStyle}>{w.style}</span>
              <span className={`${styles.cardMinutes} tabular`}>{w.minutes} min</span>
            </div>
            <div className={styles.cardTitle}>{w.title}</div>
            <p className={styles.cardDesc}>{w.description}</p>
            <Link href={`/fitness/${w.id}`} className={styles.cardCta}>
              Start
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
