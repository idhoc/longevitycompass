import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { MindPanel } from "@/components/panels/MindPanel";
import styles from "./page.module.css";

export default function MindPage() {
  return (
    <div className={styles.page}>
      <SiteNav />
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/home" className={styles.backLink}>← Home</Link>
          <span className="eyebrow" style={{ color: "var(--mind)" }}>Mind · Stress &amp; Purpose</span>
          <h1>Reflect, breathe, or step away</h1>
          <p className={styles.headerSub}>
            A daily reflection, a real guided meditation with a reactive breathing visual, and a
            timed nudge to put the screen down.
          </p>
        </div>
      </div>
      <div className={styles.content}>
        <MindPanel />
      </div>
    </div>
  );
}
