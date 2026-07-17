"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import styles from "./Orb.module.css";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface StateParams {
  amp: number; // how far the blobs deform from a perfect circle
  speed: number; // animation speed multiplier
  glow: number; // outer halo intensity 0-1
  core: number; // inner core brightness 0-1
}

const STATE_PARAMS: Record<OrbState, StateParams> = {
  idle: { amp: 0.05, speed: 0.35, glow: 0.35, core: 0.55 },
  listening: { amp: 0.14, speed: 0.9, glow: 0.65, core: 0.75 },
  thinking: { amp: 0.09, speed: 1.6, glow: 0.55, core: 0.65 },
  speaking: { amp: 0.2, speed: 1.3, glow: 0.85, core: 0.95 },
};

const BLOB_COUNT = 5;

/**
 * A liquid, glowing presence — canvas-drawn metaball-style blobs behind
 * a soft CSS halo, deliberately not a flat waveform or a static icon.
 * The same component grounds both the Coach (a voice state) and guided
 * meditation (a slow breathing pulse), so the app has one consistent
 * "someone is here" visual instead of a different widget per screen.
 */
export function Orb({
  state,
  size = 220,
  color = "var(--signal)",
  className,
}: {
  state: OrbState;
  size?: number;
  color?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Resolve the CSS custom property to a concrete color once — canvas
    // fillStyle can't read var() directly.
    const probe = document.createElement("span");
    probe.style.color = color;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    const match = resolved.match(/\d+/g);
    const [r, g, b] = match ? match.map(Number) : [0, 241, 159];

    const seeds = Array.from({ length: BLOB_COUNT }, (_, i) => ({
      angle: (i / BLOB_COUNT) * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      radiusJitter: 0.7 + Math.random() * 0.3,
    }));

    let raf = 0;
    let t = 0;

    function draw() {
      if (!ctx) return;
      const { amp, speed, glow, core } = STATE_PARAMS[stateRef.current];
      t += 0.016 * speed;

      const cx = size / 2;
      const cy = size / 2;
      const baseR = size * 0.28;

      ctx.clearRect(0, 0, size, size);

      // Outer halo
      const haloR = size * (0.42 + glow * 0.08 + Math.sin(t * 0.6) * 0.015);
      const halo = ctx.createRadialGradient(cx, cy, baseR * 0.3, cx, cy, haloR);
      halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.35 * glow})`);
      halo.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Liquid core: overlapping soft blobs orbiting the center, each
      // pulsing independently — reads as one fluid organism, not a
      // rigid circle.
      ctx.globalCompositeOperation = "lighter";
      seeds.forEach((seed, i) => {
        const wobble = Math.sin(t * 1.3 + seed.phase) * amp;
        const orbit = seed.angle + t * 0.15 * (i % 2 === 0 ? 1 : -1);
        const dist = baseR * 0.32 * seed.radiusJitter * (1 + wobble * 0.5);
        const bx = cx + Math.cos(orbit) * dist;
        const by = cy + Math.sin(orbit) * dist;
        const br = baseR * (0.55 + wobble) * seed.radiusJitter;

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * core})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      });

      // Bright center
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.5);
      centerGrad.addColorStop(0, `rgba(255, 255, 255, ${0.55 * core})`);
      centerGrad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${0.5 * core})`);
      centerGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";

      if (!reducedMotion) raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [size, color, reducedMotion]);

  return (
    <div
      className={`${styles.wrap} ${className ?? ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Coach presence: ${state}`}
    >
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
    </div>
  );
}
