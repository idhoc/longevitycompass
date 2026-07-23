"use client";

import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { MindPanel } from "@/components/panels/MindPanel";
import { ProductTour } from "@/components/ProductTour";
import { buildTourSteps } from "@/lib/tourSteps";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import styles from "./page.module.css";

export default function MindPage() {
  const [tourPending, setTourPending, tourHydrated] = useLocalStorageState<boolean>("lc_tour_pending_v1", false);
  const [tourIndex, setTourIndex] = useLocalStorageState<number>("lc_tour_index_v1", 0);
  const [tourHasInsight] = useLocalStorageState<boolean>("lc_tour_has_insight_v1", false);
  const tourSteps = buildTourSteps(tourHasInsight);

  function finishTour() {
    setTourPending(false);
    setTourIndex(0);
  }

  return (
    <div className={styles.page}>
      <SiteNav />
      {tourHydrated && tourPending && (
        <ProductTour steps={tourSteps} index={tourIndex} onIndexChange={setTourIndex} onDone={finishTour} />
      )}
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
