export type DomainKey = "sleep" | "nutrition" | "fitness" | "mind";

export const DEFAULT_DOMAIN_ORDER: DomainKey[] = ["sleep", "nutrition", "fitness", "mind"];

export const GOAL_OPTIONS: { key: DomainKey; label: string; hint: string }[] = [
  { key: "sleep", label: "Sleep better", hint: "Fall asleep easier, wake up with more energy" },
  { key: "nutrition", label: "Eat with more intention", hint: "Less guessing, more knowing what you actually ate" },
  { key: "fitness", label: "Move consistently", hint: "Build a routine that survives a busy week" },
  { key: "mind", label: "Feel more grounded", hint: "Purpose, connection, less reactive stress" },
];

export const SLEEP_HOURS_OPTIONS = ["Under 6", "6 to 7", "7 to 8", "8 or more"] as const;
export const SLEEP_COMPLAINT_OPTIONS = [
  "Hard to fall asleep",
  "Wake up during the night",
  "Wake up groggy",
  "Inconsistent schedule",
  "No real complaint",
] as const;

export const ACTIVITY_LEVEL_OPTIONS = [
  { key: "sedentary", label: "Mostly sedentary" },
  { key: "light", label: "Light activity" },
  { key: "moderate", label: "Moderately active" },
  { key: "active", label: "Very active" },
] as const;

export const WORKOUT_STYLE_OPTIONS = ["Strength", "Cardio", "Mobility", "Mixed", "Not sure yet"] as const;

export const NUTRITION_PATTERN_OPTIONS = [
  "Mostly cook at home",
  "Eat out often",
  "Skip meals when busy",
  "Already tracking closely",
  "No real pattern",
] as const;

export interface UserProfile {
  name: string;
  ageRange: "18-29" | "30-44" | "45-59" | "60+" | "";
  primaryGoals: DomainKey[];
  sleepHours: (typeof SLEEP_HOURS_OPTIONS)[number] | "";
  sleepComplaints: string[];
  activityLevel: (typeof ACTIVITY_LEVEL_OPTIONS)[number]["key"] | "";
  workoutStyle: (typeof WORKOUT_STYLE_OPTIONS)[number] | "";
  nutritionPattern: (typeof NUTRITION_PATTERN_OPTIONS)[number] | "";
  stressLevel: number;
  completedAt: string | null;
}

export const EMPTY_PROFILE: UserProfile = {
  name: "",
  ageRange: "",
  primaryGoals: [],
  sleepHours: "",
  sleepComplaints: [],
  activityLevel: "",
  workoutStyle: "",
  nutritionPattern: "",
  stressLevel: 3,
  completedAt: null,
};

export function domainOrderFromProfile(profile: UserProfile | null): DomainKey[] {
  if (!profile || profile.primaryGoals.length === 0) return DEFAULT_DOMAIN_ORDER;
  const rest = DEFAULT_DOMAIN_ORDER.filter((k) => !profile.primaryGoals.includes(k));
  return [...profile.primaryGoals, ...rest];
}
