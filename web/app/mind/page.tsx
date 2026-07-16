import { SiteNav } from "@/components/SiteNav";
import { MindPanel } from "@/components/panels/MindPanel";
import styles from "./page.module.css";

export default function MindPage() {
  return (
    <div className={styles.page}>
      <SiteNav active="/dashboard" />
      <div className={styles.header}>
        <span className="eyebrow">Mind &amp; Purpose</span>
        <h1>Reflect, breathe, or step away</h1>
        <p className={styles.headerSub}>
          A daily reflection, a real guided meditation with a reactive breathing visual, and a
          timed nudge to put the screen down.
        </p>
      </div>
      <div className={styles.content}>
        <MindPanel />
      </div>
    </div>
  );
}
