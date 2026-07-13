"use client";

import { useEffect, useState } from "react";

/**
 * Mirrors the CSS `prefers-reduced-motion` query for the WebGL/canvas
 * animation loops, which can't be paused via CSS alone since they drive
 * their own render loops (useFrame / requestAnimationFrame).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // matchMedia only exists client-side, so the real value must be read
    // post-mount rather than in a lazy initializer (which would run during
    // hydration and risk mismatching the server-rendered `false` default).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(query.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}
