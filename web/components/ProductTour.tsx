"use client";

import { useEffect, useState } from "react";
import styles from "./ProductTour.module.css";

export interface TourStep {
  /** Matches a data-tour="..." attribute on the real element being explained. */
  target: string;
  title: string;
  body: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * A real guided walkthrough of the actual dashboard: it finds the real
 * DOM element for each step (via data-tour), draws a highlight ring
 * around it, and explains that specific element — never the same text
 * twice, unlike the old onboarding "tap around" preview this replaces.
 */
export function ProductTour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[index];

  useEffect(() => {
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
  }, [step]);

  const isLast = index === steps.length - 1;

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
          Step {index + 1} of {steps.length}
        </p>
        <h3 className={styles.title}>{step.title}</h3>
        <p className={styles.body}>{step.body}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.skipBtn} onClick={onDone}>
            Skip tour
          </button>
          <div className={styles.navBtns}>
            {index > 0 && (
              <button type="button" className={styles.backBtn} onClick={() => setIndex((i) => i - 1)}>
                Back
              </button>
            )}
            <button
              type="button"
              className={styles.nextBtn}
              onClick={() => (isLast ? onDone() : setIndex((i) => i + 1))}
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
