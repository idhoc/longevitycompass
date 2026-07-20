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
      icon: "moon",
    },
    {
      id: "apple-watch-import",
      domain: "sleep",
      title: "Apple Watch / Health import",
      description: "Pull real sleep and resting heart rate straight from your Health app export.",
      href: "/settings",
      feature: "Unique feature: parses your real export.xml, entirely on this device",
      icon: "watch",
    },
    {
      id: "vitals",
      domain: "sleep",
      title: "Vitals",
      description: "Resting heart rate against your own baseline, tracked night over night.",
      href: "/recovery",
      feature: "Unique feature: compares tonight against your own last 7 nights, not a population norm",
      icon: "heart-pulse",
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
      icon: "camera",
    },
    {
      id: "recipe-finder",
      domain: "nutrition",
      title: "What can I make?",
      description: "Photograph your fridge or pantry and get a recipe built from what's actually there.",
      href: "/nutrition?topic=recipe",
      feature: "Unique feature: recipes generated from a photo of your real ingredients",
      icon: "chef-hat",
    },
  ],
  fitness: [
    {
      id: "guided-workouts",
      domain: "fitness",
      title: "Guided workouts",
      description: "Step-by-step sessions, paced by a timer, with the reasoning behind each exercise.",
      href: "/fitness",
      feature: "Unique feature: a real-time workout-load estimate while the session runs",
      icon: "dumbbell",
    },
    {
      id: "build-routine",
      domain: "fitness",
      title: "Build your own routine",
      description: "Pick your own exercises, sets, reps, and rest — save it for next time.",
      href: "/fitness/build",
      feature: "Unique feature: fully custom routines, saved to this device",
      icon: "wrench",
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
      icon: "wind",
    },
    {
      id: "reflect",
      domain: "mind",
      title: "Reflect",
      description: "A short daily prompt on purpose and connection — the habit of noticing.",
      href: "/mind?topic=reflect",
      feature: "Unique feature: a rotating prompt bank, tracked as a real streak",
      icon: "notebook-pen",
    },
    {
      id: "mindful-break",
      domain: "mind",
      title: "Focus timer",
      description: "A real pomodoro cycle — focus, then a short break, automatically, with every block logged.",
      href: "/mind?topic=break",
      feature: "Unique feature: focus and break phases that actually cycle, not a single flat countdown",
      icon: "timer",
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

export function domainColor(domain: DomainKey): string {
  return DOMAIN_META[domain].color;
}

/** The lead topic from each domain, in priority order — what Home's
 * preview strip shows, so "Topics" reads as the actual front door instead
 * of a buried nav item. */
export function featuredTopics(domainOrder: DomainKey[], count = 4): Topic[] {
  return domainOrder.map((domain) => DOMAIN_TOPICS[domain][0]).slice(0, count);
}
