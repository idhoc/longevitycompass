export type MeditationFocus = "calm" | "focus" | "sleep" | "gratitude";
export type MeditationLength = "short" | "long";

export interface MeditationVariant {
  length: MeditationLength;
  minutes: number;
  script: string;
}

export interface MeditationCategory {
  focus: MeditationFocus;
  title: string;
  description: string;
  variants: MeditationVariant[];
}

export const MEDITATION_CATEGORIES: MeditationCategory[] = [
  {
    focus: "calm",
    title: "Calm",
    description: "Box breathing to settle the nervous system before something stressful.",
    variants: [
      {
        length: "short",
        minutes: 2,
        script:
          "Find a comfortable position, and let your shoulders drop. We're going to breathe in a box pattern — four counts in, four held, four out, four held. In. Hold. Out. Hold. Once more, at your own pace. In. Hold. Out. Hold. Let your breathing return to normal, and when you're ready, open your eyes.",
      },
      {
        length: "long",
        minutes: 5,
        script:
          "Find a comfortable position, and let your shoulders drop. We're going to breathe in a box pattern — four counts in, four counts held, four counts out, four counts held. Breathe in, two, three, four. Hold, two, three, four. Breathe out, two, three, four. Hold, two, three, four. Let's do that again, at your own pace. In. Hold. Out. Hold. Notice if your mind wanders — that's normal, just come back to the count. In. Hold. Out. Hold. Let the pattern get easier each round, your body finding it without needing to count as hard. In. Hold. Out. Hold. One more round, in no hurry. In. Hold. Out. Hold. Let your breathing return to normal, and when you're ready, open your eyes.",
      },
    ],
  },
  {
    focus: "focus",
    title: "Focus",
    description: "A short reset to clear mental clutter before deep work.",
    variants: [
      {
        length: "short",
        minutes: 2,
        script:
          "Sit up, and take one full breath in, and out. Notice any thoughts still pulling at your attention from before this moment — don't push them away, just notice them, and set them down. Bring your attention fully to your breath, the feeling of air moving in and out. When your mind wanders, and it will, just come back to the breath, without judging yourself for wandering. One more breath, and when you're ready, open your eyes, ready for what's next.",
      },
      {
        length: "long",
        minutes: 5,
        script:
          "Sit up straight, and take one full breath in, and out. Notice any thoughts still pulling at your attention from before this moment — don't push them away, just notice them, name them briefly in your mind, and set them down. Bring your attention fully to your breath, the feeling of air moving in through your nose and out. When your mind wanders, and it will, that's not a failure — it's the practice. Just notice, and come back to the breath. Now bring to mind the one thing you most need to focus on next. Picture yourself doing it, calmly and clearly, without the noise. Let that image settle. Take one more full breath. When you're ready, open your eyes, ready for what's next.",
      },
    ],
  },
  {
    focus: "sleep",
    title: "Sleep",
    description: "A body scan to release tension you're not consciously aware of.",
    variants: [
      {
        length: "short",
        minutes: 3,
        script:
          "Get into a comfortable position, lying down, and let your eyes close. Starting at your feet, notice any tension and let it go. Move up through your legs, your stomach, your chest, releasing as you go. Relax your shoulders, your arms, your hands. Soften your jaw and your face. Take one more slow breath, feeling heavier with each exhale. Let yourself drift.",
      },
      {
        length: "long",
        minutes: 8,
        script:
          "Get into a comfortable position, lying down, and let your eyes close if that feels right. Start by noticing your feet — any tension there, and let it go. Move your attention up to your calves and knees, relaxing anything you find. Now your thighs and hips, letting them soften into whatever is supporting you. Bring your attention to your stomach and lower back — most people carry more tension here than they realize. Just notice it, and breathe into it. Move up to your chest and upper back, letting your breath slow down naturally. Notice your shoulders — let them drop away from your ears. Relax your arms, all the way down to your fingertips. Soften your neck and jaw. Relax your face, your forehead, the space between your eyebrows. With each breath out, let yourself sink a little heavier into the bed. There is nowhere else you need to be right now. Let your thoughts slow down, one at a time, further apart, until there's just the weight of your body and the quiet. Let yourself drift.",
      },
    ],
  },
  {
    focus: "gratitude",
    title: "Gratitude",
    description: "Shift out of a reactive or stressed headspace.",
    variants: [
      {
        length: "short",
        minutes: 2,
        script:
          "Settle into a comfortable position and take a slow breath in, and out. Bring to mind one person who has helped you recently. Silently thank them for it. Now bring to mind one small thing about today that went better than expected, and actually let yourself feel it. Take one more breath, and when you're ready, open your eyes.",
      },
      {
        length: "long",
        minutes: 4,
        script:
          "Settle into a comfortable position and take a slow breath in, and out. Bring to mind one person who has helped you recently, in a small way or a large one. Picture them clearly, and notice what they actually did. Silently, in your own words, thank them for it. Now bring to mind one thing about today, even a small one, that went better than expected. Let yourself actually feel a moment of appreciation for it, rather than just naming it. Finally, bring to mind one thing about your own effort today that you're willing to acknowledge. You don't have to be perfect to have done something worth noticing. Take one more breath, and when you're ready, open your eyes and carry this with you.",
      },
    ],
  },
];

export function getCategory(focus: string): MeditationCategory | undefined {
  return MEDITATION_CATEGORIES.find((c) => c.focus === focus);
}

export function getVariant(focus: string, length: string): MeditationVariant | undefined {
  return getCategory(focus)?.variants.find((v) => v.length === length);
}
