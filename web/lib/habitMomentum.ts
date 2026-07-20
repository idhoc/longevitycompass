export type HabitMomentumBand = "strong" | "steady" | "light";

export interface HabitMomentumInputs {
  sleepReach: number;
  fitnessReach: number;
  nutritionReach: number;
  mindReach: number;
}

/**
 * An honest habit-consistency index, not a biological-age claim — we have
 * no blood, DNA-methylation, or wearable biomarker data to back a real
 * "pace of aging" number (see DunedinPACE for what a real version of that
 * measures). This is a self-reported-consistency proxy: 1.0 is an average
 * week, below 1.0 means you logged and completed more across domains than
 * usual, above 1.0 means less. Bounded to a plausible display range
 * (~0.7-1.3x) so it reads as a trend, not a score.
 */
export function computeHabitMomentum(inputs: HabitMomentumInputs) {
  const avg = (inputs.sleepReach + inputs.fitnessReach + inputs.nutritionReach + inputs.mindReach) / 4;
  const raw = 1.3 - avg * 0.6;
  const momentum = Math.round(raw * 100) / 100;
  const band: HabitMomentumBand = momentum < 0.92 ? "strong" : momentum > 1.08 ? "light" : "steady";
  return { momentum, band };
}
