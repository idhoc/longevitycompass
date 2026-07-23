export interface TourStep {
  /** Matches a data-tour="..." attribute on the real element being explained. */
  target: string;
  title: string;
  body: string;
  /** The route this step's element actually lives on — when the current
   * page doesn't match, ProductTour navigates there before continuing,
   * so the tour can walk through more than just the dashboard. */
  href: string;
}

/**
 * One shared tour spanning Home and Mind — built once here instead of
 * per-page, so ProductTour can navigate between them mid-tour and both
 * pages stay in sync on the same step list.
 */
export function buildTourSteps(hasTopInsight: boolean): TourStep[] {
  return [
    {
      target: "hero",
      href: "/home",
      title: "Your day at a glance",
      body: "A quick greeting and, once you've logged something in any of the four areas, a note on which one is worth your attention first today.",
    },
    {
      target: "topics",
      href: "/home",
      title: "Topics",
      body: "Short explainers for anything the app can help with — sleep tracking, guided workouts, meal photos, and more. Tap one to read what it actually does before you use it.",
    },
    {
      target: "vitals",
      href: "/home",
      title: "Your Compass",
      body: "Each ring is one of the four areas — sleep, nutrition, fitness, mind. Each wedge is a day, with today on top. The four numbers below it are today's real values: sleep duration, resting heart rate, recovery, and training load.",
    },
    ...(hasTopInsight
      ? [
          {
            target: "insight",
            href: "/home",
            title: "Cross-domain insights",
            body: "When you've logged enough nights and sessions, this surfaces real patterns found in your own data — like a link between late caffeine and worse sleep — not a generic tip.",
          },
        ]
      : []),
    {
      target: "tileRecovery",
      href: "/home",
      title: "Recovery",
      body: "Log last night's sleep here — bedtime, wake time, quality, what got in the way. That single check-in is what powers the Compass and the vitals above.",
    },
    {
      target: "tileNutrition",
      href: "/home",
      title: "Nutrition",
      body: "Photograph a meal instead of describing it. You get an editable calorie and macro breakdown you can correct if it's off, plus a running total for today.",
    },
    {
      target: "tileFitness",
      href: "/home",
      title: "Fitness",
      body: "Guided, timer-paced sessions with a reason given for every exercise, plus a builder if you'd rather make your own routine from the full library.",
    },
    {
      target: "tileMind",
      href: "/home",
      title: "Mind",
      body: "Reflect, meditate, take a focused break, or just play some sound — let's actually walk through what's in here.",
    },
    {
      target: "wren",
      href: "/mind",
      title: "Meet Wren",
      body: "Wren is a real back-and-forth companion for daily reflection — type or talk out loud, and Wren can speak its replies back to you. It's a supportive guidance-counselor voice, not a therapist — anything heavier than a daily check-in gets pointed to a real professional or a crisis line instead.",
    },
    {
      target: "mindMeditate",
      href: "/mind",
      title: "Meditate",
      body: "Guided, narrated meditations with a breathing visual that actually expands and contracts with the pace — pick a focus and a length, and a human-sounding voice talks you through it.",
    },
    {
      target: "mindFocus",
      href: "/mind",
      title: "Focus timer",
      body: "A real Pomodoro cycle — a focused work block followed by a short break, logged so you can see how many blocks you actually finish in a day.",
    },
    {
      target: "mindSounds",
      href: "/mind",
      title: "Sounds",
      body: "White noise, rain, or ocean — synthesized right in your browser, no files to download, and each one sounds genuinely different up close.",
    },
    {
      target: "healthspan",
      href: "/home",
      title: "Habit Momentum",
      body: "Unlocks after 5 logged days: a consistency trend across all four areas, not a medical or biological-age measurement — just a mirror for your own patterns over time.",
    },
  ];
}
