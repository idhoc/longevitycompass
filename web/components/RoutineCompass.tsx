"use client";

import { useState } from "react";
import type { DomainDayReach } from "@/lib/domainReach";
import styles from "./RoutineCompass.module.css";

const SIZE = 272;
const CENTER = SIZE / 2;
const RING_INNER = 40;
const RING_THICKNESS = 19;
const RING_GAP = 3;
const WEDGE_GAP_DEG = 2.4;

const RINGS: { key: keyof Omit<DomainDayReach, "date">; label: string; color: string }[] = [
  { key: "sleep", label: "Sleep", color: "var(--signal)" },
  { key: "nutrition", label: "Nutrition", color: "var(--nutrition)" },
  { key: "fitness", label: "Fitness", color: "var(--fitness)" },
  { key: "mind", label: "Mind", color: "var(--mind)" },
];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function sectorPath(cx: number, cy: number, rInner: number, rOuter: number, startAngle: number, endAngle: number) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const p1 = polar(cx, cy, rOuter, startAngle);
  const p2 = polar(cx, cy, rOuter, endAngle);
  const p3 = polar(cx, cy, rInner, endAngle);
  const p4 = polar(cx, cy, rInner, startAngle);
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function weekdayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

interface RoutineCompassProps {
  days: DomainDayReach[]; // oldest first, last entry = today
  centerLabel: string;
  centerValue: string;
}

/**
 * The compass, made real: not a decorative dial but a radial calendar of
 * the actual routine — one wedge per day, one ring per domain, reach
 * mapped straight from stored entries. Today sits fixed at 12 o'clock;
 * older days fall away counter-clockwise, so the shape of a good week
 * (or a slipping one) reads at a glance.
 */
export function RoutineCompass({ days, centerLabel, centerValue }: RoutineCompassProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const n = days.length;
  const step = 360 / n;
  const wedgeWidth = step - WEDGE_GAP_DEG;

  function angleForIndex(i: number) {
    // Today (last index) is fixed at -90deg (12 o'clock); earlier days
    // fall away counter-clockwise from there.
    return -90 - (n - 1 - i) * step;
  }

  const active = activeIndex != null ? days[activeIndex] : days[n - 1];
  const activeIsToday = activeIndex == null || activeIndex === n - 1;

  return (
    <div className={styles.wrap}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={styles.svg}
        aria-label={`Routine compass — reach across sleep, nutrition, fitness, and mind for the last ${n} days. Tab through each day below for the exact numbers.`}
      >
        {days.map((day, i) => {
          const start = angleForIndex(i);
          const end = start + wedgeWidth;
          const isToday = i === n - 1;
          return (
            <g key={day.date}>
              {RINGS.map((ring, ringIndex) => {
                const rInner = RING_INNER + ringIndex * (RING_THICKNESS + RING_GAP);
                const rOuter = rInner + RING_THICKNESS;
                const reach = Math.max(0, Math.min(1, day[ring.key]));
                const path = sectorPath(CENTER, CENTER, rInner, rOuter, start, end);
                return (
                  <path
                    key={ring.key}
                    d={path}
                    fill={ring.color}
                    fillOpacity={reach > 0 ? 0.16 + reach * 0.74 : 0.07}
                    stroke={activeIndex === i ? "var(--ink)" : "transparent"}
                    strokeWidth={activeIndex === i ? 1.5 : 0}
                    className={styles.wedge}
                    aria-hidden="true"
                  />
                );
              })}
              <path
                d={sectorPath(CENTER, CENTER, RING_INNER, RING_INNER + 4 * RING_THICKNESS + 3 * RING_GAP, start, end)}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex(null)}
                tabIndex={0}
                role="button"
                aria-label={`${weekdayLabel(day.date)}${isToday ? " (today)" : ""}: sleep ${Math.round(day.sleep * 100)}%, nutrition ${Math.round(day.nutrition * 100)}%, fitness ${Math.round(day.fitness * 100)}%, mind ${Math.round(day.mind * 100)}%`}
                className={styles.hitArea}
              />
              {isToday && (
                <path
                  d={sectorPath(CENTER, CENTER, RING_INNER - 5, RING_INNER - 2, start, end)}
                  fill="var(--ink)"
                  className={styles.todayMarker}
                  aria-hidden="true"
                />
              )}
            </g>
          );
        })}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RING_INNER - 12}
          fill="var(--paper-raised)"
          stroke="var(--line)"
          aria-hidden="true"
        />
      </svg>

      <div className={styles.center} aria-hidden="true">
        <span className={styles.centerValue}>{centerValue}</span>
        <span className={styles.centerLabel}>{centerLabel}</span>
      </div>

      <div className={styles.readout} aria-live="polite">
        <span className={styles.readoutDay}>
          {weekdayLabel(active.date)}
          {activeIsToday ? " · Today" : ""}
        </span>
        <div className={styles.readoutRow}>
          {RINGS.map((ring) => (
            <span key={ring.key} className={styles.readoutStat}>
              <span className={styles.readoutDot} style={{ background: ring.color }} aria-hidden="true" />
              {ring.label} {Math.round(active[ring.key] * 100)}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
