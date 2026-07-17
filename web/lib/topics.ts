import type { DomainKey } from "./profile";

export interface Topic {
  id: string;
  domain: DomainKey;
  title: string;
  description: string;
  href: string;
  feature: string;
  icon: string;
}

const DOMAIN_TOPICS: Record<DomainKey, Topic[]> = {
  sleep: [
    {
      id: "sleep-tracking",
      domain: "sleep",
      title: "Sleep tracking",
      description: "Log tonight's bedtime, wake time, and quality — see an estimated stage breakdown.",
      href: "/recovery",
      feature: "Unique feature: estimated sleep-stage bar, built from your own check-in",
      icon: "🌙",
    },
    {
      id: "apple-watch-import",
      domain: "sleep",
      title: "Apple Watch / Health import",
      description: "Pull real sleep and resting heart rate straight from your Health app export.",
      href: "/settings",
      feature: "Unique feature: parses your real export.xml, entirely on this device",
      icon: "⌚",
    },
    {
      id: "vitals-journal",
      domain: "sleep",
      title: "Vitals & recovery journal",
      description: "Resting heart rate against your own baseline, plus a nightly behavior log.",
      href: "/recovery",
      feature: "Unique feature: correlates logged behaviors against next-day Recovery",
      icon: "💓",
    },
  ],
  nutrition: [
    {
      id: "meal-log",
      domain: "nutrition",
      title: "Meal photo log",
      description: "Photograph what you're eating instead of describing it — get calories and macros back.",
      href: "/nutrition",
      feature: "Unique feature: real vision-AI meal analysis, no manual food search",
      icon: "🍽️",
    },
    {
      id: "recipe-finder",
      domain: "nutrition",
      title: "What can I make?",
      description: "Photograph your fridge or pantry and get a recipe built from what's actually there.",
      href: "/nutrition?topic=recipe",
      feature: "Unique feature: recipes generated from a photo of your real ingredients",
      icon: "🥘",
    },
  ],
  fitness: [
    {
      id: "guided-workouts",
      domain: "fitness",
      title: "Guided workouts",
      description: "Step-by-step sessions, paced by a timer, with the reasoning behind each exercise.",
      href: "/fitness",
      feature: "Unique feature: live strain tracking while the session runs",
      icon: "🏋️",
    },
    {
      id: "build-routine",
      domain: "fitness",
      title: "Build your own routine",
      description: "Pick your own exercises, sets, reps, and rest — save it for next time.",
      href: "/fitness/build",
      feature: "Unique feature: fully custom routines, saved to this device",
      icon: "🛠️",
    },
  ],
  mind: [
    {
      id: "guided-meditation",
      domain: "mind",
      title: "Guided meditation",
      description: "A narrated session with a breathing orb that expands and settles with your breath.",
      href: "/mind?topic=meditate",
      feature: "Unique feature: a reactive glowing orb, paced to real narrated audio",
      icon: "🧘",
    },
    {
      id: "reflect",
      domain: "mind",
      title: "Reflect",
      description: "A short daily prompt on purpose and connection — the habit of noticing.",
      href: "/mind?topic=reflect",
      feature: "Unique feature: a rotating prompt bank, tracked as a real streak",
      icon: "📝",
    },
    {
      id: "mindful-break",
      domain: "mind",
      title: "Mindful break",
      description: "A timed nudge to step away from the screen for a few minutes.",
      href: "/mind?topic=break",
      feature: "Unique feature: a real countdown timer, not just a reminder banner",
      icon: "⏱️",
    },
  ],
};

const DOMAIN_META: Record<DomainKey, { label: string; color: string }> = {
  sleep: { label: "Sleep & Recovery", color: "var(--signal)" },
  nutrition: { label: "Nutrition", color: "var(--nutrition)" },
  fitness: { label: "Fitness & Movement", color: "var(--fitness)" },
  mind: { label: "Mind & Purpose", color: "var(--mind)" },
};

export interface TopicGroup {
  domain: DomainKey;
  label: string;
  color: string;
  topics: Topic[];
}

/** Domains ordered by the user's own stated priorities, each with its
 * topics in place — the personalization the profile actually earns you,
 * beyond just a static feature list. */
export function topicGroupsFromOrder(domainOrder: DomainKey[]): TopicGroup[] {
  return domainOrder.map((domain) => ({
    domain,
    label: DOMAIN_META[domain].label,
    color: DOMAIN_META[domain].color,
    topics: DOMAIN_TOPICS[domain],
  }));
}

export function allTopics(): Topic[] {
  return Object.values(DOMAIN_TOPICS).flat();
}
