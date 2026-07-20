export type DomainKey = "sleep" | "nutrition" | "fitness" | "mind";

export const DEFAULT_DOMAIN_ORDER: DomainKey[] = ["sleep", "nutrition", "fitness", "mind"];

export const GOAL_OPTIONS: { key: DomainKey; label: string; hint: string; icon: string }[] = [
  { key: "sleep", label: "Better sleep", hint: "Fall asleep easier, wake up with more energy", icon: "🌙" },
  { key: "nutrition", label: "Eat well", hint: "Less guessing, more knowing what you actually ate", icon: "🍎" },
  { key: "fitness", label: "Move more", hint: "Build a routine that survives a busy week", icon: "🏃" },
  { key: "mind", label: "Feel grounded", hint: "Purpose, connection, less reactive stress", icon: "🧘" },
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

export const DIETARY_OPTIONS = [
  "No restrictions",
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
] as const;

export const CAFFEINE_OPTIONS = ["None", "1 cup a day", "2-3 cups a day", "4+ cups a day"] as const;

export const SEX_OPTIONS = ["Female", "Male", "Intersex", "Prefer not to say"] as const;

/** Buckets an exact age into the coarse range the rest of the app's
 * age-adaptive logic (Fitness ordering, Topics) already keys off of —
 * onboarding now collects the real number, but nothing downstream needs
 * to change to use it. */
export function ageRangeFromExactAge(age: number | null): UserProfile["ageRange"] {
  if (age == null || !Number.isFinite(age)) return "";
  if (age < 30) return "18-29";
  if (age < 45) return "30-44";
  if (age < 60) return "45-59";
  return "60+";
}

export function lbToKg(lb: number): number {
  return lb * 0.453592;
}
export function kgToLb(kg: number): number {
  return kg / 0.453592;
}
export function ftInToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}
export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return { feet, inches };
}

export const TONE_OPTIONS = [
  {
    key: "warm",
    label: "Warm",
    hint: "Encouraging, checks in on how things feel, not just the numbers.",
  },
  {
    key: "direct",
    label: "Direct",
    hint: "Short, plain, no cushioning — just what's true and what to do.",
  },
  {
    key: "clinical",
    label: "Clinical",
    hint: "Data-forward, minimal small talk, reads like a lab report.",
  },
] as const;

export type CoachTone = (typeof TONE_OPTIONS)[number]["key"];

export const INTENSITY_OPTIONS = [
  {
    key: "gentle",
    label: "Gentle",
    hint: "Softer framing, fewer blunt numbers, no confrontational language.",
  },
  {
    key: "standard",
    label: "Standard",
    hint: "Honest and direct, including numbers that might be uncomfortable.",
  },
] as const;

export type ContentIntensity = (typeof INTENSITY_OPTIONS)[number]["key"];

export const UNITS_OPTIONS = [
  { key: "imperial", label: "Imperial", hint: "lb, ft/in, °F" },
  { key: "metric", label: "Metric", hint: "kg, cm, °C" },
] as const;

export type UnitsPreference = (typeof UNITS_OPTIONS)[number]["key"];

export const LANGUAGE_OPTIONS = [
  { key: "English", label: "English" },
  { key: "Spanish", label: "Español" },
  { key: "Mandarin Chinese", label: "中文" },
  { key: "Hindi", label: "हिन्दी" },
  { key: "French", label: "Français" },
  { key: "Portuguese", label: "Português" },
  { key: "Arabic", label: "العربية" },
  { key: "Japanese", label: "日本語" },
] as const;

export type CoachLanguage = (typeof LANGUAGE_OPTIONS)[number]["key"];

export interface UserProfile {
  name: string;
  ageRange: "18-29" | "30-44" | "45-59" | "60+" | "";
  /** The real number, collected directly instead of only a bucket —
   * ageRange is still derived from this for the existing age-adaptive
   * logic elsewhere in the app. */
  exactAge: number | null;
  sex: (typeof SEX_OPTIONS)[number] | "";
  heightCm: number | null;
  weightKg: number | null;
  /** Free-text answers to the AI's own follow-up questions during
   * onboarding — not thrown away after the reflection, fed to the Coach
   * as real grounding context. */
  onboardingNotes: string[];
  primaryGoals: DomainKey[];
  sleepHours: (typeof SLEEP_HOURS_OPTIONS)[number] | "";
  sleepComplaints: string[];
  activityLevel: (typeof ACTIVITY_LEVEL_OPTIONS)[number]["key"] | "";
  workoutStyle: (typeof WORKOUT_STYLE_OPTIONS)[number] | "";
  nutritionPattern: (typeof NUTRITION_PATTERN_OPTIONS)[number] | "";
  dietaryRestrictions: string[];
  caffeineHabit: (typeof CAFFEINE_OPTIONS)[number] | "";
  injuries: string;
  stressLevel: number;
  tone: CoachTone;
  intensity: ContentIntensity;
  units: UnitsPreference;
  language: CoachLanguage;
  /** Whether the Coach may use OpenAI's hosted web search to ground
   * replies in current research — off means every reply comes only from
   * the model's own training, nothing about the conversation leaves this
   * app as a search query. Defaults on. */
  webSearchEnabled: boolean;
  disclaimerAcknowledged: boolean;
  completedAt: string | null;
}

export const EMPTY_PROFILE: UserProfile = {
  name: "",
  ageRange: "",
  exactAge: null,
  sex: "",
  heightCm: null,
  weightKg: null,
  onboardingNotes: [],
  primaryGoals: [],
  sleepHours: "",
  sleepComplaints: [],
  activityLevel: "",
  workoutStyle: "",
  nutritionPattern: "",
  dietaryRestrictions: [],
  caffeineHabit: "",
  injuries: "",
  stressLevel: 3,
  tone: "warm",
  intensity: "standard",
  units: "imperial",
  language: "English",
  webSearchEnabled: true,
  disclaimerAcknowledged: false,
  completedAt: null,
};

export const TONE_SYSTEM_PROMPT: Record<CoachTone, string> = {
  warm: "Speak warmly and personally, like someone who genuinely cares how this person is doing, not just what they logged. Use their name when natural.",
  direct: "Speak in short, plain sentences. No cushioning, no filler, no 'I understand this can be hard' — just what's true and what to do next.",
  clinical: "Speak in a data-forward, measured register — lead with the number or finding, minimal small talk, close to how a lab report reads.",
};

export const INTENSITY_SYSTEM_PROMPT: Record<ContentIntensity, string> = {
  gentle: "Use softer framing. Avoid blunt or confrontational phrasing, avoid dwelling on worst-case framing, and keep any uncomfortable numbers in supportive context.",
  standard: "Be straightforwardly honest, including numbers or comparisons that might be uncomfortable, framed constructively rather than harshly.",
};

/** Per-domain plan focus, generated from the onboarding answers — the
 * richer "what we'll actually do" output the profile drives beyond just
 * ordering the four domain pages. */
export function domainPlanFromProfile(profile: UserProfile | null): Record<DomainKey, string> {
  const p = profile;
  return {
    sleep:
      p?.sleepComplaints && p.sleepComplaints.length && p.sleepComplaints[0] !== "No real complaint"
        ? `Focused on: ${p.sleepComplaints.join(", ").toLowerCase()}. Starting from a ${p.sleepHours || "baseline"} night.`
        : "Establishing a baseline, then watching what moves the needle night to night.",
    nutrition:
      p?.nutritionPattern && p.nutritionPattern !== "No real pattern"
        ? `Working with how you actually eat: ${p.nutritionPattern.toLowerCase()}${
            p.dietaryRestrictions.length && !p.dietaryRestrictions.includes("No restrictions")
              ? `, keeping it ${p.dietaryRestrictions.join(" and ").toLowerCase()}`
              : ""
          }.`
        : "Photographing meals first, to see the real pattern before changing anything.",
    fitness:
      p?.workoutStyle && p.workoutStyle !== "Not sure yet"
        ? `Built around ${p.workoutStyle.toLowerCase()} training, matched to a ${p.activityLevel || "current"} baseline${
            p.injuries ? `, working around ${p.injuries.toLowerCase()}` : ""
          }.`
        : "Starting light and consistent, then finding what you actually enjoy doing.",
    mind:
      p?.stressLevel != null
        ? p.stressLevel >= 4
          ? "Stress is running high right now — short daily check-ins and a real mindful-break habit come first."
          : "A short daily reflection to build the habit of noticing, before anything more involved."
        : "A short daily reflection to build the habit of noticing.",
  };
}

export function domainOrderFromProfile(profile: UserProfile | null): DomainKey[] {
  if (!profile || profile.primaryGoals.length === 0) return DEFAULT_DOMAIN_ORDER;
  const rest = DEFAULT_DOMAIN_ORDER.filter((k) => !profile.primaryGoals.includes(k));
  return [...profile.primaryGoals, ...rest];
}
