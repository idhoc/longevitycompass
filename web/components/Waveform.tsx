"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

const STATE_PARAMS: Record<VoiceState, { amp: number; speed: number; bars: number; jitter: number }> = {
  idle: { amp: 0.12, speed: 0.6, bars: 44, jitter: 0.04 },
  listening: { amp: 0.55, speed: 1.4, bars: 44, jitter: 0.5 },
  thinking: { amp: 0.32, speed: 2.6, bars: 44, jitter: 0.08 },
  speaking: { amp: 0.78, speed: 1.8, bars: 44, jitter: 0.22 },
};

/**
 * A literal instrument reading rather than a decorative orb: a bar-style
 * waveform, canvas-2D (not WebGL — voice is fundamentally a 1D amplitude
 * signal, and treating it as one is more honest than a glowing sphere).
 */
export function Waveform({ state, className }: { state: VoiceState; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const reducedMotion = usePrefersReducedMotion();

  // Keep the ref in sync in an effect, not during render — mutating a ref's
  // .current while rendering is invalid under React's concurrent renderer
  // even though it worked in practice under React 18.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const seeds = Array.from({ length: 64 }, () => Math.random() * Math.PI * 2);

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const { amp, speed, bars, jitter } = STATE_PARAMS[stateRef.current];
      t += 0.016 * speed;

      ctx.clearRect(0, 0, rect.width, rect.height);
      const midY = rect.height / 2;
      const gap = rect.width / bars;
      const barWidth = gap * 0.42;

      for (let i = 0; i < bars; i++) {
        const seed = seeds[i % seeds.length];
        const wave = Math.sin(t * 1.6 + i * 0.35 + seed) * 0.5 + 0.5;
        const noise = (Math.sin(t * 3.1 + seed * 4.0) * 0.5 + 0.5) * jitter;
        const centerFalloff = 1 - Math.abs(i / bars - 0.5) * 0.9;
        const h = Math.max(2, (wave * 0.7 + noise) * amp * rect.height * centerFalloff);

        const x = i * gap + (gap - barWidth) / 2;
        ctx.fillStyle = i % 5 === 0 ? "#5eead4" : "#c9a66b";
        ctx.globalAlpha = 0.55 + centerFalloff * 0.35;
        ctx.fillRect(x, midY - h / 2, barWidth, h);
      }
      ctx.globalAlpha = 1;
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    }

    // draw() re-schedules itself via rAF only when motion isn't reduced, so
    // this single call renders one still frame under reduced motion and
    // starts the normal loop otherwise.
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
