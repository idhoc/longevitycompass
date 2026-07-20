import { Sparkles } from "lucide-react";
import type { CrossDomainInsight } from "@/lib/insights";
import styles from "./InsightsPanel.module.css";

export function InsightsPanel({ insights, loggedNights }: { insights: CrossDomainInsight[]; loggedNights: number }) {
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <Sparkles className={styles.headIcon} aria-hidden="true" />
        <span className={styles.headLabel}>Cross-domain insights</span>
      </div>
      {insights.length === 0 ? (
        <p className={styles.empty}>
          {loggedNights < 6
            ? `Log a few more nights — including caffeine timing and what got in the way — plus a session or two, and real patterns will surface here. ${loggedNights} night${loggedNights === 1 ? "" : "s"} logged so far.`
            : "Nothing strong enough to call out yet from what you've logged. That's a real read of your data, not an empty placeholder."}
        </p>
      ) : (
        <ul className={styles.list}>
          {insights.map((insight) => (
            <li key={insight.id} className={styles.item}>
              <p className={styles.headline}>{insight.headline}</p>
              <p className={styles.detail}>{insight.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
