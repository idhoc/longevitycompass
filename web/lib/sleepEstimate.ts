/**
 * Derives an approximate sleep-stage breakdown from a quick self-reported
 * check-in (quality rating + awakening count), anchored to typical adult
 * population proportions. This is explicitly an ESTIMATE, not a measurement
 * — the UI must always label it that way. Real stage data would come from
 * a wearable integration (Oura/Whoop/Google Fit), which is a natural next
 * step, not something to fake here.
 */
export function estimateSleepStages(quality: number, awakenings: number) {
  let deepPct = 16;
  let remPct = 22;
  let lightPct = 55;
  let awakePct = 7;

  const qualityAdj = (quality - 3) * 2; // -4..+4
  deepPct += qualityAdj;
  remPct += qualityAdj * 0.6;

  const awakenAdj = Math.min(10, awakenings * 2.2);
  awakePct += awakenAdj;
  lightPct -= awakenAdj * 0.7;
  deepPct -= awakenAdj * 0.3;

  deepPct = Math.max(4, deepPct);
  remPct = Math.max(6, remPct);
  awakePct = Math.max(2, awakePct);
  lightPct = Math.max(20, lightPct);

  const total = deepPct + remPct + lightPct + awakePct;
  return {
    deepPct: (deepPct / total) * 100,
    remPct: (remPct / total) * 100,
    lightPct: (lightPct / total) * 100,
    awakePct: (awakePct / total) * 100,
  };
}

export function minutesBetween(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) return 0;
  const start = bh * 60 + bm;
  let end = wh * 60 + wm;
  if (end <= start) end += 24 * 60; // crossed midnight
  return end - start;
}
