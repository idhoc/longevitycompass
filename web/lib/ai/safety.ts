// Defense-in-depth scope enforcement, ported from the original app's
// coach.js — this is what "coaching, not medicine" actually means in code,
// not just in copy. Checked locally BEFORE any model call, in addition to
// the model's own instructed escalation logic (never rely on a single
// layer). Kept identical in spirit to the live vanilla app so both surfaces
// enforce the same boundary.

export const ESCALATION_MARKERS = [
  "outside wellness coaching",
  "licensed professional",
  "emergency services",
  "contact a doctor",
  "contact a licensed",
];

export interface SafetyProfile {
  restingHeartRate?: number | string;
  systolicBP?: number | string;
  diastolicBP?: number | string;
  chestPain?: boolean;
  suicidalIdeation?: boolean;
}

function toFiniteOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Returns a plain-text escalation message, or null if nothing tripped. */
export function checkLocalRedFlags(profile: SafetyProfile = {}): string | null {
  const hr = toFiniteOrNull(profile.restingHeartRate);
  if (hr !== null && (hr > 100 || hr < 40)) {
    return "A resting heart rate outside 40-100 bpm is outside wellness coaching — please contact a licensed professional to review this. If you're experiencing symptoms right now, contact emergency services.";
  }
  const sys = toFiniteOrNull(profile.systolicBP);
  const dia = toFiniteOrNull(profile.diastolicBP);
  if ((sys !== null && sys >= 180) || (dia !== null && dia >= 120)) {
    return "Blood pressure in this range is outside wellness coaching — please contact a licensed professional or emergency services now.";
  }
  if (profile.chestPain === true) {
    return "Chest pain is outside wellness coaching — please contact emergency services now.";
  }
  if (profile.suicidalIdeation === true) {
    return "This is outside wellness coaching. Please contact a crisis line or emergency services now — in the US, call or text 988.";
  }
  return null;
}

export function containsEscalationLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return ESCALATION_MARKERS.some((marker) => lower.includes(marker));
}

// The actual "how the AI coaches" instruction, shared by every mode below —
// Motivational Interviewing rather than a generic assistant reciting facts.
export const MI_STYLE_TEXT = [
  "Coach using Motivational Interviewing (MI): collaborative, evokes the person's own motivation, never lectures.",
  "1) Reflect the person's specific situation back in one plain sentence before advising — use an actual number or fact they gave you, never a generic opener.",
  "2) Frame the action as an invitation, not a command — 'one option that fits what you told me' rather than 'you must'.",
  "3) Cite real, specific numbers whenever you have them — a study finding, a percentage, a half-life, a threshold. Never vague quantifiers like 'more' or 'some' when you could be specific.",
  "4) Affirm effort before correcting course.",
  "5) Sound like one specific, warm, competent person talking once — short, plain sentences a person of any age can follow. No filler, no therapy-speak, no listicle.",
].join(" ");

export const SCOPE_TEXT = [
  "You are a longevity wellness coach, not a clinician. Stay inside wellness coaching: lifestyle, nutrition, movement, sleep, stress, and purpose.",
  "The moment a question involves diagnosis, medication (dosing, interactions, starting/stopping), a specific concerning symptom, or anything a reasonable clinician would want to personally evaluate — stop, say plainly that this is outside wellness coaching, and recommend contacting a licensed professional (or emergency services if urgent). Do not soften this into a guess.",
  "Every claim you make should be grounded in real, named research or well-established physiology — cite the mechanism or finding, not just an instruction. If you don't have a solid basis for a specific number, say what you do know rather than inventing precision.",
].join(" ");
