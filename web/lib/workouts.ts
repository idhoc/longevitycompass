export interface WorkoutStep {
  name: string;
  cue: string;
  durationSeconds?: number;
  reps?: number;
  tempo?: string;
}

export interface WorkoutRoutine {
  id: string;
  title: string;
  style: "Strength" | "Cardio" | "Mobility" | "Mixed";
  minutes: number;
  description: string;
  steps: WorkoutStep[];
}

export const WORKOUTS: WorkoutRoutine[] = [
  {
    id: "strength-15",
    title: "Bodyweight Strength",
    style: "Strength",
    minutes: 15,
    description: "A full-body strength circuit — no equipment, paced by tempo rather than a clock.",
    steps: [
      { name: "March in place", cue: "Warm up — knees up, easy pace.", durationSeconds: 30 },
      { name: "Bodyweight squats", cue: "Chest up, weight in your heels.", reps: 12, tempo: "2s down, 1s up" },
      { name: "Push-ups", cue: "Knees down is a full rep too — keep the line straight.", reps: 10, tempo: "2s down, 1s up" },
      { name: "Rest", cue: "Shake it out.", durationSeconds: 20 },
      { name: "Reverse lunges", cue: "Step back, drop the back knee toward the floor.", reps: 10, tempo: "2s down, 1s up" },
      { name: "Plank hold", cue: "Straight line from shoulders to heels.", durationSeconds: 30 },
      { name: "Rest", cue: "Breathe.", durationSeconds: 20 },
      { name: "Glute bridges", cue: "Squeeze at the top, don't arch your lower back.", reps: 15, tempo: "1s up, 1s down" },
      { name: "Cool-down stretch", cue: "Standing forward fold, let your neck relax.", durationSeconds: 30 },
    ],
  },
  {
    id: "cardio-12",
    title: "Quick Cardio",
    style: "Cardio",
    minutes: 12,
    description: "Short, intense intervals to get your heart rate up without any equipment.",
    steps: [
      { name: "Jumping jacks", cue: "Steady pace to start.", durationSeconds: 40 },
      { name: "Rest", cue: "Walk it off.", durationSeconds: 15 },
      { name: "High knees", cue: "Drive your knees up, quick feet.", durationSeconds: 30 },
      { name: "Rest", cue: "Recover.", durationSeconds: 15 },
      { name: "Mountain climbers", cue: "Hips level, drive knees to chest.", durationSeconds: 30 },
      { name: "Rest", cue: "Recover.", durationSeconds: 15 },
      { name: "Burpees", cue: "Your pace — step back instead of jumping if you need to.", durationSeconds: 30 },
      { name: "Rest", cue: "Almost there.", durationSeconds: 20 },
      { name: "Jumping jacks", cue: "One more round.", durationSeconds: 40 },
      { name: "Cool-down walk", cue: "Let your heart rate come down.", durationSeconds: 30 },
    ],
  },
  {
    id: "mobility-10",
    title: "Mobility Reset",
    style: "Mobility",
    minutes: 10,
    description: "Loosen up a stiff neck, hips, and shoulders — good before or after sitting all day.",
    steps: [
      { name: "Neck rolls", cue: "Slow, both directions.", durationSeconds: 20 },
      { name: "Shoulder rolls", cue: "Big circles, both directions.", durationSeconds: 20 },
      { name: "Cat-cow stretch", cue: "On hands and knees, arch and round slowly.", durationSeconds: 30 },
      { name: "Hip circles", cue: "Hands on hips, slow full circles.", durationSeconds: 30 },
      { name: "World's greatest stretch", cue: "Lunge, rotate toward your front knee.", durationSeconds: 30 },
      { name: "Child's pose", cue: "Sink your hips back, reach forward.", durationSeconds: 30 },
      { name: "Standing forward fold", cue: "Let your head and arms hang heavy.", durationSeconds: 30 },
    ],
  },
  {
    id: "mixed-15",
    title: "Mixed Session",
    style: "Mixed",
    minutes: 15,
    description: "A blend of strength, a cardio burst, and a mobility cool-down.",
    steps: [
      { name: "March in place", cue: "Warm up.", durationSeconds: 30 },
      { name: "Bodyweight squats", cue: "Chest up, weight in your heels.", reps: 12, tempo: "2s down, 1s up" },
      { name: "Push-ups", cue: "Knees down counts.", reps: 10, tempo: "2s down, 1s up" },
      { name: "Jumping jacks", cue: "Get your heart rate up.", durationSeconds: 40 },
      { name: "Rest", cue: "Recover.", durationSeconds: 20 },
      { name: "Mountain climbers", cue: "Hips level, quick feet.", durationSeconds: 30 },
      { name: "Rest", cue: "Recover.", durationSeconds: 20 },
      { name: "Glute bridges", cue: "Squeeze at the top.", reps: 15, tempo: "1s up, 1s down" },
      { name: "Child's pose", cue: "Cool down, breathe.", durationSeconds: 30 },
    ],
  },
];

export function getWorkout(id: string): WorkoutRoutine | undefined {
  return WORKOUTS.find((w) => w.id === id);
}
