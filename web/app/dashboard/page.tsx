import { SiteNav } from "@/components/SiteNav";
import { TrajectoryScene } from "@/components/TrajectoryScene";
import styles from "./page.module.css";

// Sample data standing in for real weekly-adherence numbers — in the shipped
// product this comes from the same tracked-completion data the current app
// already stores, not a new data model.
const DOMAINS = [
  {
    label: "Movement",
    reach: 0.63,
    text: "3 of 5 planned sessions this week, including yesterday's guided mobility flow.",
  },
  {
    label: "Nutrition",
    reach: 0.81,
    text: "Fiber target met 5 of 7 days. Protein at dinner is the one gap left.",
  },
  {
    label: "Mind",
    reach: 0.92,
    text: "A daily purpose check-in, six days running — your longest streak yet.",
  },
  {
    label: "Recovery",
    reach: 0.47,
    text: "Sleep averaged 6.1h against a 7.5h target. This is where next week's plan will focus.",
  },
] as const;

const OVERALL = Math.round(
  (DOMAINS.reduce((sum, d) => sum + d.reach, 0) / DOMAINS.length) * 100
);

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <SiteNav active="/dashboard" />

      <div className={styles.header}>
        <span className="eyebrow">This week</span>
        <h1>Where the curve is bending</h1>
        <p className={styles.headerSub}>
          Each domain draws its own trajectory from real tracked adherence — the brighter
          segment is what you&apos;ve actually earned so far this week, not a projection.
        </p>
      </div>

      <div className={styles.overview}>
        <div className={styles.overviewStat}>
          <div className={styles.overviewNum}>{OVERALL}%</div>
          <div className={styles.overviewLabel}>Overall trajectory, this week</div>
        </div>
        <div className={styles.overviewScene}>
          <TrajectoryScene
            reach={OVERALL / 100}
            interactive={false}
            radius={0.045}
            colorStart="#8b8d7e"
            colorEnd="#3e6b4f"
          />
        </div>
      </div>

      <div className={styles.grid}>
        {DOMAINS.map((d) => (
          <div className={styles.card} key={d.label}>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>{d.label}</span>
              <span className={`${styles.cardPct} tabular`}>{Math.round(d.reach * 100)}%</span>
            </div>
            <div className={styles.cardScene}>
              <TrajectoryScene
                reach={d.reach}
                interactive={false}
                radius={0.032}
                colorStart="#8b8d7e"
                colorEnd="#3e6b4f"
              />
            </div>
            <p className={styles.cardText}>{d.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
