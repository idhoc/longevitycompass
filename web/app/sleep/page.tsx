import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SleepPanel } from "@/components/panels/SleepPanel";
import styles from "./page.module.css";

export default function SleepPage() {
  return (
    <div className={styles.page}>
      <SiteNav active="/home" />
      <div className={styles.header}>
        <Link href="/home" className={styles.backLink}>← Home</Link>
        <span className="eyebrow">Sleep &amp; Recovery</span>
        <h1>Last night, in detail</h1>
        <p className={styles.headerSub}>
          A real check-in on last night, an estimated stage breakdown, and a causal diagnostic
          for why today feels the way it does.
        </p>
      </div>
      <div className={styles.content}>
        <SleepPanel />
      </div>
    </div>
  );
}
