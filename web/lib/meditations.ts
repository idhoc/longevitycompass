export interface MeditationScript {
  id: string;
  title: string;
  minutes: number;
  focus: string;
  script: string;
}

export const MEDITATIONS: MeditationScript[] = [
  {
    id: "box-breathing-3",
    title: "Box Breathing",
    minutes: 3,
    focus: "Calm the nervous system before something stressful",
    script:
      "Find a comfortable position, and let your shoulders drop. We're going to breathe in a box pattern — four counts in, four counts held, four counts out, four counts held. Breathe in, two, three, four. Hold, two, three, four. Breathe out, two, three, four. Hold, two, three, four. Let's do that again, at your own pace. In. Hold. Out. Hold. Notice if your mind wanders — that's normal, just come back to the count. In. Hold. Out. Hold. One more round. In. Hold. Out. Hold. Let your breathing return to normal, and when you're ready, open your eyes.",
  },
  {
    id: "body-scan-5",
    title: "Body Scan",
    minutes: 5,
    focus: "Release physical tension you're not consciously aware of",
    script:
      "Get into a comfortable position, seated or lying down, and let your eyes close if that feels right. Start by noticing your feet — any tension there, and let it go. Move your attention up to your calves and knees, relaxing anything you find. Now your thighs and hips, letting them soften into whatever is supporting you. Bring your attention to your stomach and lower back — most people carry more tension here than they realize. Just notice it, and breathe into it. Move up to your chest and upper back, letting your breath slow down naturally. Notice your shoulders — let them drop away from your ears. Relax your arms, all the way down to your fingertips. Soften your neck and jaw. Relax your face, your forehead, the space between your eyebrows. Take one more full breath, noticing your whole body at once. When you're ready, gently open your eyes.",
  },
  {
    id: "gratitude-3",
    title: "A Moment of Gratitude",
    minutes: 3,
    focus: "Shift out of a reactive or stressed headspace",
    script:
      "Settle into a comfortable position and take a slow breath in, and out. Bring to mind one person who has helped you recently, in a small way or a large one. Picture them clearly, and notice what they actually did. Silently, in your own words, thank them for it. Now bring to mind one thing about today, even a small one, that went better than expected. Let yourself actually feel a moment of appreciation for it. Finally, bring to mind one thing about your own effort today that you're willing to acknowledge. You don't have to be perfect to have done something worth noticing. Take one more breath, and when you're ready, open your eyes.",
  },
];

export function getMeditation(id: string): MeditationScript | undefined {
  return MEDITATIONS.find((m) => m.id === id);
}
