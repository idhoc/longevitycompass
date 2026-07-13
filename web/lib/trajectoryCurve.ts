import * as THREE from "three";

/**
 * The shape every "Trajectory" visual in this app is built from: a steep
 * early rise that flattens into a long, steady climb — the same silhouette
 * as a real survival/compounding curve, not a decorative sine wave. `reach`
 * (0-1) controls how far along the curve is actually drawn, so the same
 * shape can represent "the aspirational full curve" (reach=1, landing hero)
 * or "this domain's real progress so far" (reach=adherence, dashboard).
 */
export function buildTrajectoryPoints(
  reach: number,
  opts?: { width?: number; height?: number; depthWobble?: number; samples?: number }
): THREE.Vector3[] {
  const width = opts?.width ?? 8;
  const height = opts?.height ?? 2.6;
  const depthWobble = opts?.depthWobble ?? 0.35;
  const samples = opts?.samples ?? 160;
  const clampedReach = Math.max(0.02, Math.min(1, reach));

  const points: THREE.Vector3[] = [];
  const count = Math.max(8, Math.round(samples * clampedReach));

  for (let i = 0; i <= count; i++) {
    const t = (i / samples) * width - width / 2; // -width/2 .. up to reach point
    const xNorm = (i / samples); // 0..reach
    // fast early compounding (1 - e^-kx) + a gentle continued climb
    const rise = 1 - Math.exp(-4.2 * xNorm);
    const climb = xNorm * 0.55;
    const y = (rise * 0.72 + climb) * height - height * 0.32;
    const z = Math.sin(xNorm * Math.PI * 1.6) * depthWobble * (0.3 + xNorm * 0.7);
    points.push(new THREE.Vector3(t, y, z));
  }
  return points;
}
