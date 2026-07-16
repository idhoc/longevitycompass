export type AgingPaceBand = "slower" | "typical" | "faster";

export interface AgingPaceInputs {
  sleepReach: number;
  fitnessReach: number;
  nutritionReach: number;
  mindReach: number;
}

/**
 * An honest "pace of aging" index, not a biological-age-in-years claim —
 * we have no blood, DNA-methylation, or wearable biomarker data to back a
 * real number like that (see DunedinPACE for what a real version of this
 * measures). This is a self-reported-habit proxy: 1.0 = an average pace,
 * below 1.0 tracks slower, above 1.0 tracks faster. Bounded to the
 * plausible range real pace-of-aging research reports (~0.7-1.3x).
 */
export function computeAgingPace(inputs: AgingPaceInputs) {
  const avg = (inputs.sleepReach + inputs.fitnessReach + inputs.nutritionReach + inputs.mindReach) / 4;
  const raw = 1.3 - avg * 0.6;
  const pace = Math.round(raw * 100) / 100;
  const band: AgingPaceBand = pace < 0.92 ? "slower" : pace > 1.08 ? "faster" : "typical";
  return { pace, band };
}
