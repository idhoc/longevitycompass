import type { UserProfile } from "./profile";

export interface MacroTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
  personalized: boolean;
}

const GENERIC: MacroTargets = { proteinG: 100, carbsG: 250, fatG: 70, personalized: false };

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

/**
 * Real macro targets from the Mifflin-St Jeor resting-energy-expenditure
 * equation — the formula actually used clinically, not an invented
 * number — split into a protein target from bodyweight (1.6g/kg, a
 * well-supported range for active adults) and the remainder split
 * carbs/fat 60/40. Falls back to a plain generic target, honestly
 * labeled as such, whenever age, sex, height, or weight aren't all on
 * file — a partial guess dressed up as personal is worse than an
 * admitted default.
 */
export function macroTargetsFromProfile(profile: UserProfile | null): MacroTargets {
  if (!profile || profile.exactAge == null || !profile.sex || profile.heightCm == null || profile.weightKg == null) {
    return GENERIC;
  }
  const { exactAge: age, sex, heightCm, weightKg } = profile;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === "Male" ? base + 5 : sex === "Female" ? base - 161 : base - 78;
  const multiplier = ACTIVITY_MULTIPLIER[profile.activityLevel] ?? 1.375;
  const tdee = bmr * multiplier;

  const proteinG = Math.round(weightKg * 1.6);
  const proteinKcal = proteinG * 4;
  const remainingKcal = Math.max(0, tdee - proteinKcal);
  const carbsG = Math.round((remainingKcal * 0.6) / 4);
  const fatG = Math.round((remainingKcal * 0.4) / 9);

  return { proteinG, carbsG, fatG, personalized: true };
}
