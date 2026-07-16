export type ExerciseCategory = "warmup" | "strength" | "cardio" | "mobility" | "cooldown";
export type ExerciseType = "timed" | "reps";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  type: ExerciseType;
  defaultSeconds?: number;
  defaultReps?: number;
  tempo?: string;
  cue: string;
  why: string;
}

export const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  warmup: "Warm-up",
  strength: "Strength",
  cardio: "Cardio",
  mobility: "Mobility",
  cooldown: "Cooldown",
};

export const EXERCISE_LIBRARY: Exercise[] = [
  {
    id: "rest",
    name: "Rest",
    category: "warmup",
    type: "timed",
    defaultSeconds: 20,
    cue: "Catch your breath.",
    why: "Rest lets your phosphocreatine stores partially refill, which is what keeps effort quality high across a whole session — skipping it just makes every set after it worse.",
  },
  {
    id: "march-in-place",
    name: "March in place",
    category: "warmup",
    type: "timed",
    defaultSeconds: 30,
    cue: "Knees up, easy pace.",
    why: "Raises heart rate and blood flow to muscle gradually, which measurably lowers injury risk versus starting an intense set cold.",
  },
  {
    id: "arm-circles",
    name: "Arm circles",
    category: "warmup",
    type: "timed",
    defaultSeconds: 20,
    cue: "Big circles, both directions.",
    why: "Loosens the shoulder joint's range of motion before any pushing or overhead movement.",
  },
  {
    id: "bodyweight-squat",
    name: "Bodyweight squats",
    category: "strength",
    type: "reps",
    defaultReps: 12,
    tempo: "2s down, 1s up",
    cue: "Chest up, weight in your heels.",
    why: "Trains the largest muscle groups in the body — quads, glutes, hamstrings. Leg strength specifically is one of the most consistent predictors of healthy aging in longitudinal studies.",
  },
  {
    id: "pushup",
    name: "Push-ups",
    category: "strength",
    type: "reps",
    defaultReps: 10,
    tempo: "2s down, 1s up",
    cue: "Knees down is a full rep too — keep the line straight.",
    why: "Builds upper-body pushing strength and core stability together. Declining upper-body strength is one of the earliest measurable markers of functional decline.",
  },
  {
    id: "reverse-lunge",
    name: "Reverse lunges",
    category: "strength",
    type: "reps",
    defaultReps: 10,
    tempo: "2s down, 1s up",
    cue: "Step back, drop the back knee toward the floor.",
    why: "Trains single-leg strength and balance together — a major predictor of fall risk as you age, which standard two-leg exercises don't address.",
  },
  {
    id: "glute-bridge",
    name: "Glute bridges",
    category: "strength",
    type: "reps",
    defaultReps: 15,
    tempo: "1s up, 1s down",
    cue: "Squeeze at the top, don't arch your lower back.",
    why: "Strengthens the glutes and posterior chain, directly counteracting the postural effect of sitting most of the day.",
  },
  {
    id: "plank",
    name: "Plank hold",
    category: "strength",
    type: "timed",
    defaultSeconds: 30,
    cue: "Straight line from shoulders to heels.",
    why: "Builds core endurance without repeated spinal flexion — a safer way to build core strength than repeated crunches, especially over the long run.",
  },
  {
    id: "jumping-jacks",
    name: "Jumping jacks",
    category: "cardio",
    type: "timed",
    defaultSeconds: 40,
    cue: "Steady pace to start.",
    why: "A full-body movement that elevates heart rate quickly. Cardiovascular capacity is one of the single strongest predictors of longevity across the research.",
  },
  {
    id: "high-knees",
    name: "High knees",
    category: "cardio",
    type: "timed",
    defaultSeconds: 30,
    cue: "Drive your knees up, quick feet.",
    why: "A higher-intensity interval that trains how quickly your body recovers between efforts — a real, trainable marker of fitness.",
  },
  {
    id: "mountain-climbers",
    name: "Mountain climbers",
    category: "cardio",
    type: "timed",
    defaultSeconds: 30,
    cue: "Hips level, drive knees to chest.",
    why: "Combines cardio output with core stability under movement — closer to real-world physical demand than a static core hold.",
  },
  {
    id: "burpees",
    name: "Burpees",
    category: "cardio",
    type: "timed",
    defaultSeconds: 30,
    cue: "Your pace — step back instead of jumping if you need to.",
    why: "One of the highest-output bodyweight movements available. A small amount goes a long way for cardiovascular conditioning.",
  },
  {
    id: "cat-cow",
    name: "Cat-cow stretch",
    category: "mobility",
    type: "timed",
    defaultSeconds: 30,
    cue: "On hands and knees, arch and round slowly.",
    why: "Moves the spine through flexion and extension, which keeps the discs and surrounding tissue supplied with nutrients through movement.",
  },
  {
    id: "hip-circles",
    name: "Hip circles",
    category: "mobility",
    type: "timed",
    defaultSeconds: 30,
    cue: "Hands on hips, slow full circles.",
    why: "Restores hip mobility that stiffens from long periods of sitting — stiff hips otherwise transfer load to the lower back.",
  },
  {
    id: "worlds-greatest-stretch",
    name: "World's greatest stretch",
    category: "mobility",
    type: "timed",
    defaultSeconds: 30,
    cue: "Lunge, rotate toward your front knee.",
    why: "Opens the hips, spine, and shoulders in one sequence — an efficient way to address the joints that stiffen most from a sedentary day.",
  },
  {
    id: "childs-pose",
    name: "Child's pose",
    category: "cooldown",
    type: "timed",
    defaultSeconds: 30,
    cue: "Sink your hips back, reach forward.",
    why: "A passive stretch that shifts the nervous system out of a 'go' state and toward recovery.",
  },
  {
    id: "standing-forward-fold",
    name: "Standing forward fold",
    category: "cooldown",
    type: "timed",
    defaultSeconds: 30,
    cue: "Let your head and arms hang heavy.",
    why: "Lengthens the hamstrings and lower back passively while your heart rate settles back down.",
  },
];

export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_LIBRARY.find((e) => e.id === id);
}

export interface RoutineStep {
  exerciseId: string;
  seconds?: number;
  reps?: number;
}

export interface WorkoutRoutine {
  id: string;
  title: string;
  style: "Strength" | "Cardio" | "Mobility" | "Mixed" | "Custom";
  minutes: number;
  description: string;
  steps: RoutineStep[];
  custom?: boolean;
}

export const WORKOUTS: WorkoutRoutine[] = [
  {
    id: "strength-15",
    title: "Bodyweight Strength",
    style: "Strength",
    minutes: 15,
    description: "A full-body strength circuit — no equipment, paced by tempo rather than a clock.",
    steps: [
      { exerciseId: "march-in-place", seconds: 30 },
      { exerciseId: "bodyweight-squat", reps: 12 },
      { exerciseId: "pushup", reps: 10 },
      { exerciseId: "rest", seconds: 20 },
      { exerciseId: "reverse-lunge", reps: 10 },
      { exerciseId: "plank", seconds: 30 },
      { exerciseId: "rest", seconds: 20 },
      { exerciseId: "glute-bridge", reps: 15 },
      { exerciseId: "standing-forward-fold", seconds: 30 },
    ],
  },
  {
    id: "cardio-12",
    title: "Quick Cardio",
    style: "Cardio",
    minutes: 12,
    description: "Short, intense intervals to get your heart rate up without any equipment.",
    steps: [
      { exerciseId: "jumping-jacks", seconds: 40 },
      { exerciseId: "rest", seconds: 15 },
      { exerciseId: "high-knees", seconds: 30 },
      { exerciseId: "rest", seconds: 15 },
      { exerciseId: "mountain-climbers", seconds: 30 },
      { exerciseId: "rest", seconds: 15 },
      { exerciseId: "burpees", seconds: 30 },
      { exerciseId: "rest", seconds: 20 },
      { exerciseId: "jumping-jacks", seconds: 40 },
      { exerciseId: "march-in-place", seconds: 30 },
    ],
  },
  {
    id: "mobility-10",
    title: "Mobility Reset",
    style: "Mobility",
    minutes: 10,
    description: "Loosen up a stiff neck, hips, and shoulders — good before or after sitting all day.",
    steps: [
      { exerciseId: "arm-circles", seconds: 20 },
      { exerciseId: "cat-cow", seconds: 30 },
      { exerciseId: "hip-circles", seconds: 30 },
      { exerciseId: "worlds-greatest-stretch", seconds: 30 },
      { exerciseId: "childs-pose", seconds: 30 },
      { exerciseId: "standing-forward-fold", seconds: 30 },
    ],
  },
  {
    id: "mixed-15",
    title: "Mixed Session",
    style: "Mixed",
    minutes: 15,
    description: "A blend of strength, a cardio burst, and a mobility cool-down.",
    steps: [
      { exerciseId: "march-in-place", seconds: 30 },
      { exerciseId: "bodyweight-squat", reps: 12 },
      { exerciseId: "pushup", reps: 10 },
      { exerciseId: "jumping-jacks", seconds: 40 },
      { exerciseId: "rest", seconds: 20 },
      { exerciseId: "mountain-climbers", seconds: 30 },
      { exerciseId: "rest", seconds: 20 },
      { exerciseId: "glute-bridge", reps: 15 },
      { exerciseId: "childs-pose", seconds: 30 },
    ],
  },
];

export function getWorkout(id: string): WorkoutRoutine | undefined {
  return WORKOUTS.find((w) => w.id === id);
}

const CUSTOM_KEY = "lc_custom_workouts_v1";

export function loadCustomWorkouts(): WorkoutRoutine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as WorkoutRoutine[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomWorkout(routine: WorkoutRoutine) {
  const existing = loadCustomWorkouts();
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify([...existing, routine]));
}

export function getAnyWorkout(id: string): WorkoutRoutine | undefined {
  return getWorkout(id) ?? loadCustomWorkouts().find((w) => w.id === id);
}

export function estimateMinutes(steps: RoutineStep[]): number {
  const totalSeconds = steps.reduce((sum, step) => {
    const ex = getExercise(step.exerciseId);
    if (!ex) return sum;
    if (ex.type === "timed") return sum + (step.seconds ?? ex.defaultSeconds ?? 30);
    // rough estimate for rep-based steps: ~3.5s per rep including tempo
    return sum + (step.reps ?? ex.defaultReps ?? 10) * 3.5;
  }, 0);
  return Math.max(1, Math.round(totalSeconds / 60));
}
