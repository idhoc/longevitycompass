"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./ProductTour.module.css";
import type { TourStep } from "@/lib/tourSteps";

export type { TourStep };

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * A real guided walkthrough of the actual app: it finds the real DOM
 * element for each step (via data-tour), draws a highlight ring around
 * it, and explains that specific element. Steps can live on different
 * pages — when the current step's href doesn't match where we are, this
 * navigates there and picks the tour back up once the new page mounts,
 * so the tour isn't stuck describing the dashboard from a distance.
 * Index is controlled by the caller (and persisted) so it survives that
 * page navigation instead of resetting to step 0.
 */
export function ProductTour({
  steps,
  index,
  onIndexChange,
  onDone,
}: {
  steps: TourStep[];
  index: number;
  onIndexChange: (index: number) => void;
  onDone: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [rect, setRect] = useState<Rect | null>(null);
  const clampedIndex = Math.min(Math.max(index, 0), steps.length - 1);
  const step = steps[clampedIndex];
  const onRightPage = !!step && step.href === pathname;

  useEffect(() => {
    if (step && !onRightPage) router.push(step.href);
  }, [step, onRightPage, router]);

  useEffect(() => {
    // Nothing to measure while mid-navigation to a different step's page —
    // the component renders null in that case anyway, so a stale rect
    // here is never actually drawn.
    if (!step || !onRightPage) return;
    function measure() {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Give the smooth-scroll a moment to settle before measuring.
    const t = setTimeout(measure, 260);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, onRightPage]);

  // Nothing to show while a step's page doesn't match yet (mid-navigation)
  // or the step list is empty.
  if (!step || !onRightPage) return null;

  const isLast = clampedIndex === steps.length - 1;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Guided tour">
      {rect && (
        <div
          className={styles.highlight}
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}
      <div className={styles.callout}>
        <p className={styles.progress}>
          Step {clampedIndex + 1} of {steps.length}
        </p>
        <h3 className={styles.title}>{step.title}</h3>
        <p className={styles.body}>{step.body}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.skipBtn} onClick={onDone}>
            Skip tour
          </button>
          <div className={styles.navBtns}>
            {clampedIndex > 0 && (
              <button type="button" className={styles.backBtn} onClick={() => onIndexChange(clampedIndex - 1)}>
                Back
              </button>
            )}
            <button
              type="button"
              className={styles.nextBtn}
              onClick={() => (isLast ? onDone() : onIndexChange(clampedIndex + 1))}
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
