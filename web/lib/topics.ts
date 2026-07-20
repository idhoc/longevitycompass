import type { DomainKey, UserProfile } from "./profile";

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

const RESTRICTION_WORD: Record<string, string> = {
  Vegetarian: "vegetarian",
  Vegan: "vegan",
  "Gluten-free": "gluten-free",
  "Dairy-free": "dairy-free",
};

/**
 * Real per-profile variation in what each topic card actually says —
 * not a reorder, an actual rewrite grounded in specific facts already on
 * the profile (age, sex, injuries, dietary restrictions, stress, weight).
 * Falls back to the generic copy whenever there's no real fact to draw
 * on, rather than inventing one — a topic with nothing personal to say
 * stays honestly generic instead of faking specificity.
 */
function personalize(topic: Topic, profile: UserProfile | null): Topic {
  if (!profile) return topic;
  const restriction = profile.dietaryRestrictions.find((r) => r !== "No restrictions" && RESTRICTION_WORD[r]);

  switch (topic.id) {
    case "sleep-tracking": {
      const complaint = profile.sleepComplaints.find((c) => c !== "No real complaint");
      if (!complaint) return topic;
      return {
        ...topic,
        description: `Log tonight's bedtime, wake time, and quality — see whether "${complaint.toLowerCase()}" eases as the week goes on.`,
      };
    }
    case "vitals": {
      if (profile.exactAge == null || profile.exactAge < 45) return topic;
      return {
        ...topic,
        description: "Resting heart rate against your own baseline — worth watching closely past 45, when it becomes a more meaningful signal.",
      };
    }
    case "meal-log": {
      if (restriction) {
        return {
          ...topic,
          description: `Photograph what you're eating instead of describing it — flagged automatically if anything doesn't fit ${RESTRICTION_WORD[restriction]}.`,
        };
      }
      if (profile.weightKg != null) {
        const proteinG = Math.round(profile.weightKg * 1.6);
        return {
          ...topic,
          description: `Photograph what you're eating — tracked against a ~${proteinG}g/day protein target (1.6g/kg), a well-supported range for your weight.`,
        };
      }
      return topic;
    }
    case "recipe-finder": {
      if (!restriction) return topic;
      return {
        ...topic,
        description: `Photograph your fridge or pantry and get a ${RESTRICTION_WORD[restriction]} recipe built from what's actually there.`,
      };
    }
    case "guided-workouts": {
      if (profile.injuries.trim()) {
        return {
          ...topic,
          description: `Step-by-step sessions, paced by a timer, worked around ${profile.injuries.trim().toLowerCase()}.`,
        };
      }
      if (profile.exactAge != null && profile.exactAge >= 60) {
        return {
          ...topic,
          description: "Step-by-step sessions, paced by a timer, leading with lower-impact options first.",
        };
      }
      return topic;
    }
    case "guided-meditation": {
      if (profile.stressLevel < 4) return topic;
      return {
        ...topic,
        description: "A narrated session with a breathing orb — built for the stress level you told us you're carrying right now.",
      };
    }
    default:
      return topic;
  }
}

/** Domains ordered by the user's own stated priorities, each with its
 * topics personalized against real profile facts — the differentiation
 * the profile actually earns you, beyond just a reordered static list. */
export function topicGroupsFromOrder(domainOrder: DomainKey[], profile: UserProfile | null = null): TopicGroup[] {
  return domainOrder.map((domain) => ({
    domain,
    label: DOMAIN_META[domain].label,
    color: DOMAIN_META[domain].color,
    topics: DOMAIN_TOPICS[domain].map((topic) => personalize(topic, profile)),
  }));
}

export function domainColor(domain: DomainKey): string {
  return DOMAIN_META[domain].color;
}

/** The lead topic from each domain, in priority order — what Home's
 * preview strip shows, so "Topics" reads as the actual front door instead
 * of a buried nav item. */
export function featuredTopics(domainOrder: DomainKey[], profile: UserProfile | null = null, count = 4): Topic[] {
  return domainOrder.map((domain) => personalize(DOMAIN_TOPICS[domain][0], profile)).slice(0, count);
}
