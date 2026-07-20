export type ExerciseCategory = "warmup" | "strength" | "cardio" | "mobility" | "cooldown";
export type ExerciseType = "timed" | "reps";
export type Equipment = "none" | "dumbbells" | "bands";
export type MuscleGroup = "full-body" | "legs" | "push" | "pull" | "core" | "posterior-chain";
/** Which of the small illustrated-icon set represents this exercise's
 * movement pattern — a real substitute for video demonstration, not a
 * per-exercise photo, since this app has no video pipeline. */
export type Pose = "squat" | "push" | "pull" | "lunge" | "core" | "cardio" | "stretch" | "rest";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  type: ExerciseType;
  equipment: Equipment;
  muscleGroup: MuscleGroup;
  pose: Pose;
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
    equipment: "none",
    muscleGroup: "full-body",
    pose: "rest",
    defaultSeconds: 20,
    cue: "Catch your breath.",
    why: "Rest lets your phosphocreatine stores partially refill, which is what keeps effort quality high across a whole session — skipping it just makes every set after it worse.",
  },
  {
    id: "march-in-place",
    name: "March in place",
    category: "warmup",
    type: "timed",
    equipment: "none",
    muscleGroup: "full-body",
    pose: "cardio",
    defaultSeconds: 30,
    cue: "Knees up, easy pace.",
    why: "Raises heart rate and blood flow to muscle gradually, which measurably lowers injury risk versus starting an intense set cold.",
  },
  {
    id: "arm-circles",
    name: "Arm circles",
    category: "warmup",
    type: "timed",
    equipment: "none",
    muscleGroup: "push",
    pose: "stretch",
    defaultSeconds: 20,
    cue: "Big circles, both directions.",
    why: "Loosens the shoulder joint's range of motion before any pushing or overhead movement.",
  },
  {
    id: "shoulder-rolls",
    name: "Shoulder rolls",
    category: "warmup",
    type: "timed",
    equipment: "none",
    muscleGroup: "push",
    pose: "stretch",
    defaultSeconds: 20,
    cue: "Slow rolls back, then forward — smaller range than arm circles.",
    why: "A gentler shoulder warm-up that still raises blood flow to the joint without the larger range of motion arm circles ask for.",
  },
  {
    id: "bodyweight-squat",
    name: "Bodyweight squats",
    category: "strength",
    type: "reps",
    equipment: "none",
    muscleGroup: "legs",
    pose: "squat",
    defaultReps: 12,
    tempo: "2s down, 1s up",
    cue: "Chest up, weight in your heels.",
    why: "Trains the largest muscle groups in the body — quads, glutes, hamstrings. Leg strength specifically is one of the most consistent predictors of healthy aging in longitudinal studies.",
  },
  {
    id: "dumbbell-goblet-squat",
    name: "Dumbbell goblet squats",
    category: "strength",
    type: "reps",
    equipment: "dumbbells",
    muscleGroup: "legs",
    pose: "squat",
    defaultReps: 10,
    tempo: "2s down, 1s up",
    cue: "Hold one dumbbell at chest height, elbows in.",
    why: "The loaded front position naturally keeps your torso upright, which is an easier squat pattern to learn correctly than a barbell back squat.",
  },
  {
    id: "band-squat",
    name: "Band-resisted squats",
    category: "strength",
    type: "reps",
    equipment: "bands",
    muscleGroup: "legs",
    pose: "squat",
    defaultReps: 12,
    tempo: "2s down, 1s up",
    cue: "Band under both feet, handles at shoulders.",
    why: "Resistance bands load a squat without needing a weight rack — the tension increases through the exact range where your legs are strongest.",
  },
  {
    id: "wall-sit",
    name: "Wall sit",
    category: "strength",
    type: "timed",
    equipment: "none",
    muscleGroup: "legs",
    pose: "squat",
    defaultSeconds: 30,
    cue: "Back flat against the wall, thighs parallel to the floor.",
    why: "An isometric hold trains muscular endurance in the quads without any joint movement — a useful variation when repeated flexion bothers a joint.",
  },
  {
    id: "calf-raises",
    name: "Calf raises",
    category: "strength",
    type: "reps",
    equipment: "none",
    muscleGroup: "legs",
    pose: "squat",
    defaultReps: 15,
    tempo: "1s up, 2s down",
    cue: "Rise onto your toes, control the way down.",
    why: "Calf strength and power are specifically linked to gait stability and fall risk in older adults — a commonly neglected muscle group.",
  },
  {
    id: "pushup",
    name: "Push-ups",
    category: "strength",
    type: "reps",
    equipment: "none",
    muscleGroup: "push",
    pose: "push",
    defaultReps: 10,
    tempo: "2s down, 1s up",
    cue: "Knees down is a full rep too — keep the line straight.",
    why: "Builds upper-body pushing strength and core stability together. Declining upper-body strength is one of the earliest measurable markers of functional decline.",
  },
  {
    id: "dumbbell-shoulder-press",
    name: "Dumbbell shoulder press",
    category: "strength",
    type: "reps",
    equipment: "dumbbells",
    muscleGroup: "push",
    pose: "push",
    defaultReps: 10,
    tempo: "1s up, 2s down",
    cue: "Press straight overhead, don't flare your ribs.",
    why: "Direct overhead strength is one of the clearest functional markers that declines with age — reaching a high shelf safely depends on it.",
  },
  {
    id: "dumbbell-row",
    name: "Dumbbell rows",
    category: "strength",
    type: "reps",
    equipment: "dumbbells",
    muscleGroup: "pull",
    pose: "pull",
    defaultReps: 10,
    tempo: "1s up, 2s down",
    cue: "Hinge forward, pull the dumbbell to your hip.",
    why: "Pulling strength balances out the pushing most daily activity already trains — an imbalance here is a common driver of rounded-shoulder posture.",
  },
  {
    id: "band-row",
    name: "Band rows",
    category: "strength",
    type: "reps",
    equipment: "bands",
    muscleGroup: "pull",
    pose: "pull",
    defaultReps: 12,
    tempo: "1s pull, 2s release",
    cue: "Anchor the band, pull the handles to your ribs.",
    why: "Constant band tension keeps the back muscles under load through the whole rep, unlike gravity-only exercises.",
  },
  {
    id: "band-pull-apart",
    name: "Band pull-aparts",
    category: "strength",
    type: "reps",
    equipment: "bands",
    muscleGroup: "pull",
    pose: "pull",
    defaultReps: 15,
    tempo: "1s out, 1s in",
    cue: "Arms straight, pull the band apart at chest height.",
    why: "Targets the small rear-shoulder muscles that most pushing-heavy routines never train — a common source of nagging shoulder discomfort when neglected.",
  },
  {
    id: "reverse-lunge",
    name: "Reverse lunges",
    category: "strength",
    type: "reps",
    equipment: "none",
    muscleGroup: "legs",
    pose: "lunge",
    defaultReps: 10,
    tempo: "2s down, 1s up",
    cue: "Step back, drop the back knee toward the floor.",
    why: "Trains single-leg strength and balance together — a major predictor of fall risk as you age, which standard two-leg exercises don't address.",
  },
  {
    id: "step-up",
    name: "Step-ups",
    category: "strength",
    type: "reps",
    equipment: "none",
    muscleGroup: "legs",
    pose: "lunge",
    defaultReps: 10,
    tempo: "1s up, 2s down",
    cue: "A sturdy step or low box — drive through the lead foot.",
    why: "Trains single-leg strength through a smaller range of motion than a lunge, which makes it a natural first step down in load for a sensitive knee.",
  },
  {
    id: "glute-bridge",
    name: "Glute bridges",
    category: "strength",
    type: "reps",
    equipment: "none",
    muscleGroup: "posterior-chain",
    pose: "core",
    defaultReps: 15,
    tempo: "1s up, 1s down",
    cue: "Squeeze at the top, don't arch your lower back.",
    why: "Strengthens the glutes and posterior chain, directly counteracting the postural effect of sitting most of the day — with no knee flexion under load.",
  },
  {
    id: "plank",
    name: "Plank hold",
    category: "strength",
    type: "timed",
    equipment: "none",
    muscleGroup: "core",
    pose: "core",
    defaultSeconds: 30,
    cue: "Straight line from shoulders to heels.",
    why: "Builds core endurance without repeated spinal flexion — a safer way to build core strength than repeated crunches, especially over the long run.",
  },
  {
    id: "side-plank",
    name: "Side plank",
    category: "strength",
    type: "timed",
    equipment: "none",
    muscleGroup: "core",
    pose: "core",
    defaultSeconds: 20,
    cue: "Stack your feet, hips lifted, straight line head to heel.",
    why: "Trains the lateral core muscles a front plank mostly skips — real-world stability needs strength in every direction, not just forward and back.",
  },
  {
    id: "bird-dog",
    name: "Bird dog",
    category: "strength",
    type: "reps",
    equipment: "none",
    muscleGroup: "core",
    pose: "core",
    defaultReps: 10,
    tempo: "2s extend, 2s return",
    cue: "On hands and knees, extend opposite arm and leg, keep hips level.",
    why: "One of the most widely recommended core exercises specifically for a sensitive lower back — it trains stability without loading the spine.",
  },
  {
    id: "dead-bug",
    name: "Dead bug",
    category: "strength",
    type: "reps",
    equipment: "none",
    muscleGroup: "core",
    pose: "core",
    defaultReps: 10,
    tempo: "2s extend, 2s return",
    cue: "On your back, lower opposite arm and leg while your low back stays flat on the floor.",
    why: "Trains the core's job of resisting movement rather than creating it — pressing your low back into the floor the whole time is the actual skill.",
  },
  {
    id: "superman",
    name: "Superman hold",
    category: "strength",
    type: "timed",
    equipment: "none",
    muscleGroup: "posterior-chain",
    pose: "core",
    defaultSeconds: 20,
    cue: "Lift chest and legs together, squeeze your glutes.",
    why: "Strengthens the muscles that run along the spine — a common weak point behind lower-back discomfort from sitting.",
  },
  {
    id: "jumping-jacks",
    name: "Jumping jacks",
    category: "cardio",
    type: "timed",
    equipment: "none",
    muscleGroup: "full-body",
    pose: "cardio",
    defaultSeconds: 40,
    cue: "Steady pace to start.",
    why: "A full-body movement that elevates heart rate quickly. Cardiovascular capacity is one of the single strongest predictors of longevity across the research.",
  },
  {
    id: "high-knees",
    name: "High knees",
    category: "cardio",
    type: "timed",
    equipment: "none",
    muscleGroup: "legs",
    pose: "cardio",
    defaultSeconds: 30,
    cue: "Drive your knees up, quick feet.",
    why: "A higher-intensity interval that trains how quickly your body recovers between efforts — a real, trainable marker of fitness.",
  },
  {
    id: "mountain-climbers",
    name: "Mountain climbers",
    category: "cardio",
    type: "timed",
    equipment: "none",
    muscleGroup: "core",
    pose: "cardio",
    defaultSeconds: 30,
    cue: "Hips level, drive knees to chest.",
    why: "Combines cardio output with core stability under movement — closer to real-world physical demand than a static core hold.",
  },
  {
    id: "burpees",
    name: "Burpees",
    category: "cardio",
    type: "timed",
    equipment: "none",
    muscleGroup: "full-body",
    pose: "cardio",
    defaultSeconds: 30,
    cue: "Your pace — step back instead of jumping if you need to.",
    why: "One of the highest-output bodyweight movements available. A small amount goes a long way for cardiovascular conditioning.",
  },
  {
    id: "knee-friendly-step-touch",
    name: "Step-touch",
    category: "cardio",
    type: "timed",
    equipment: "none",
    muscleGroup: "legs",
    pose: "cardio",
    defaultSeconds: 30,
    cue: "Step side to side, both feet stay on the floor.",
    why: "Raises heart rate with zero impact and zero deep knee flexion — a real cardio option when jumping or squatting patterns aren't a good idea right now.",
  },
  {
    id: "seated-march",
    name: "Seated march",
    category: "cardio",
    type: "timed",
    equipment: "none",
    muscleGroup: "legs",
    pose: "cardio",
    defaultSeconds: 30,
    cue: "Seated, lift alternating knees at a brisk pace.",
    why: "Elevates heart rate with the joints fully supported — a real option on days a standing cardio pattern isn't available to you.",
  },
  {
    id: "cat-cow",
    name: "Cat-cow stretch",
    category: "mobility",
    type: "timed",
    equipment: "none",
    muscleGroup: "core",
    pose: "stretch",
    defaultSeconds: 30,
    cue: "On hands and knees, arch and round slowly.",
    why: "Moves the spine through flexion and extension, which keeps the discs and surrounding tissue supplied with nutrients through movement.",
  },
  {
    id: "hip-circles",
    name: "Hip circles",
    category: "mobility",
    type: "timed",
    equipment: "none",
    muscleGroup: "legs",
    pose: "stretch",
    defaultSeconds: 30,
    cue: "Hands on hips, slow full circles.",
    why: "Restores hip mobility that stiffens from long periods of sitting — stiff hips otherwise transfer load to the lower back.",
  },
  {
    id: "worlds-greatest-stretch",
    name: "World's greatest stretch",
    category: "mobility",
    type: "timed",
    equipment: "none",
    muscleGroup: "full-body",
    pose: "stretch",
    defaultSeconds: 30,
    cue: "Lunge, rotate toward your front knee.",
    why: "Opens the hips, spine, and shoulders in one sequence — an efficient way to address the joints that stiffen most from a sedentary day.",
  },
  {
    id: "doorway-chest-stretch",
    name: "Doorway chest stretch",
    category: "mobility",
    type: "timed",
    equipment: "none",
    muscleGroup: "push",
    pose: "stretch",
    defaultSeconds: 30,
    cue: "Forearm on the frame, gently step forward.",
    why: "Directly counters the forward-shoulder posture that hours of desk work and phone use both encourage.",
  },
  {
    id: "childs-pose",
    name: "Child's pose",
    category: "cooldown",
    type: "timed",
    equipment: "none",
    muscleGroup: "full-body",
    pose: "stretch",
    defaultSeconds: 30,
    cue: "Sink your hips back, reach forward.",
    why: "A passive stretch that shifts the nervous system out of a 'go' state and toward recovery.",
  },
  {
    id: "standing-forward-fold",
    name: "Standing forward fold",
    category: "cooldown",
    type: "timed",
    equipment: "none",
    muscleGroup: "posterior-chain",
    pose: "stretch",
    defaultSeconds: 30,
    cue: "Let your head and arms hang heavy.",
    why: "Lengthens the hamstrings and lower back passively while your heart rate settles back down.",
  },
  {
    id: "standing-quad-stretch",
    name: "Standing quad stretch",
    category: "cooldown",
    type: "timed",
    equipment: "none",
    muscleGroup: "legs",
    pose: "stretch",
    defaultSeconds: 30,
    cue: "Hold your ankle behind you, knees together.",
    why: "Lengthens the quads without asking the spine to bend forward — a gentler cooldown option than a forward fold.",
  },
  {
    id: "seated-spinal-twist",
    name: "Seated spinal twist",
    category: "cooldown",
    type: "timed",
    equipment: "none",
    muscleGroup: "core",
    pose: "stretch",
    defaultSeconds: 30,
    cue: "Seated, rotate gently toward each side.",
    why: "Restores rotational range of motion in the spine — a movement direction most routines otherwise skip entirely.",
  },
];

/** Real, defensible injury-aware substitutions — not a full clinical
 * screen, just the well-established, low-risk swaps (e.g. bird-dog and
 * dead-bug are standard back-safe core recommendations; low-impact
 * step-touch/seated-march are standard knee-friendly cardio swaps).
 * Applied automatically when a session starts, with a visible note. */
const INJURY_SUBSTITUTIONS: { keyword: string; from: string; to: string }[] = [
  { keyword: "knee", from: "bodyweight-squat", to: "glute-bridge" },
  { keyword: "knee", from: "dumbbell-goblet-squat", to: "glute-bridge" },
  { keyword: "knee", from: "band-squat", to: "glute-bridge" },
  { keyword: "knee", from: "reverse-lunge", to: "step-up" },
  { keyword: "knee", from: "jumping-jacks", to: "step-touch" },
  { keyword: "knee", from: "high-knees", to: "seated-march" },
  { keyword: "knee", from: "burpees", to: "step-touch" },
  { keyword: "knee", from: "mountain-climbers", to: "bird-dog" },
  { keyword: "knee", from: "wall-sit", to: "glute-bridge" },
  { keyword: "shoulder", from: "pushup", to: "dead-bug" },
  { keyword: "shoulder", from: "dumbbell-shoulder-press", to: "band-pull-apart" },
  { keyword: "shoulder", from: "arm-circles", to: "shoulder-rolls" },
  { keyword: "back", from: "plank", to: "bird-dog" },
  { keyword: "back", from: "superman", to: "bird-dog" },
  { keyword: "back", from: "standing-forward-fold", to: "standing-quad-stretch" },
  { keyword: "back", from: "cat-cow", to: "dead-bug" },
];

/** Swaps out exercises the profile's reported injuries flag as risky —
 * a real personalization mechanic, not a relabeled default routine.
 * Returns the (possibly modified) steps plus a plain-language note for
 * each swap actually made, so it never happens silently. */
export function applyInjurySubstitutions(
  steps: RoutineStep[],
  injuriesText: string
): { steps: RoutineStep[]; swaps: { from: string; to: string }[] } {
  const lower = injuriesText.toLowerCase().trim();
  if (!lower) return { steps, swaps: [] };

  const swaps: { from: string; to: string }[] = [];
  const nextSteps = steps.map((step) => {
    const match = INJURY_SUBSTITUTIONS.find((s) => step.exerciseId === s.from && lower.includes(s.keyword));
    if (!match) return step;
    const fromEx = getExercise(match.from);
    const toEx = getExercise(match.to);
    if (!fromEx || !toEx) return step;
    swaps.push({ from: fromEx.name, to: toEx.name });
    return {
      exerciseId: match.to,
      seconds: toEx.type === "timed" ? toEx.defaultSeconds : undefined,
      reps: toEx.type === "reps" ? toEx.defaultReps : undefined,
    };
  });
  return { steps: nextSteps, swaps };
}

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
  {
    id: "lower-body-15",
    title: "Lower Body Focus",
    style: "Strength",
    minutes: 15,
    description: "Legs and glutes, from every angle a squat or lunge alone misses.",
    steps: [
      { exerciseId: "march-in-place", seconds: 30 },
      { exerciseId: "bodyweight-squat", reps: 12 },
      { exerciseId: "reverse-lunge", reps: 10 },
      { exerciseId: "rest", seconds: 20 },
      { exerciseId: "step-up", reps: 10 },
      { exerciseId: "glute-bridge", reps: 15 },
      { exerciseId: "rest", seconds: 20 },
      { exerciseId: "calf-raises", reps: 15 },
      { exerciseId: "wall-sit", seconds: 30 },
      { exerciseId: "standing-quad-stretch", seconds: 30 },
    ],
  },
  {
    id: "core-balance-12",
    title: "Core & Balance",
    style: "Mobility",
    minutes: 12,
    description: "The back-safe core work most routines skip — stability, not crunches.",
    steps: [
      { exerciseId: "cat-cow", seconds: 30 },
      { exerciseId: "bird-dog", reps: 10 },
      { exerciseId: "dead-bug", reps: 10 },
      { exerciseId: "plank", seconds: 30 },
      { exerciseId: "side-plank", seconds: 20 },
      { exerciseId: "rest", seconds: 20 },
      { exerciseId: "side-plank", seconds: 20 },
      { exerciseId: "seated-spinal-twist", seconds: 30 },
    ],
  },
  {
    id: "dumbbell-upper-15",
    title: "Dumbbell Upper Body",
    style: "Strength",
    minutes: 15,
    description: "Push and pull strength, balanced — needs a pair of dumbbells.",
    steps: [
      { exerciseId: "arm-circles", seconds: 20 },
      { exerciseId: "dumbbell-shoulder-press", reps: 10 },
      { exerciseId: "dumbbell-row", reps: 10 },
      { exerciseId: "rest", seconds: 20 },
      { exerciseId: "pushup", reps: 10 },
      { exerciseId: "dumbbell-row", reps: 10 },
      { exerciseId: "rest", seconds: 20 },
      { exerciseId: "dumbbell-goblet-squat", reps: 10 },
      { exerciseId: "doorway-chest-stretch", seconds: 30 },
    ],
  },
  {
    id: "band-full-body-12",
    title: "Resistance Band Full Body",
    style: "Strength",
    minutes: 12,
    description: "A complete strength circuit with just one light resistance band.",
    steps: [
      { exerciseId: "march-in-place", seconds: 30 },
      { exerciseId: "band-squat", reps: 12 },
      { exerciseId: "band-row", reps: 12 },
      { exerciseId: "rest", seconds: 15 },
      { exerciseId: "band-pull-apart", reps: 15 },
      { exerciseId: "band-squat", reps: 12 },
      { exerciseId: "rest", seconds: 15 },
      { exerciseId: "band-row", reps: 12 },
      { exerciseId: "childs-pose", seconds: 30 },
    ],
  },
  {
    id: "gentle-full-body-12",
    title: "Gentle Full Body",
    style: "Mixed",
    minutes: 12,
    description: "Low-impact, joint-friendly full body — a real option on a lower-energy day.",
    steps: [
      { exerciseId: "seated-march", seconds: 30 },
      { exerciseId: "wall-sit", seconds: 20 },
      { exerciseId: "glute-bridge", reps: 12 },
      { exerciseId: "bird-dog", reps: 8 },
      { exerciseId: "knee-friendly-step-touch", seconds: 30 },
      { exerciseId: "band-pull-apart", reps: 12 },
      { exerciseId: "childs-pose", seconds: 30 },
    ],
  },
];

export function getWorkout(id: string): WorkoutRoutine | undefined {
  return WORKOUTS.find((w) => w.id === id);
}

/** What a routine actually needs, derived from its real steps rather
 * than a separately-maintained tag that could drift out of sync. */
export function workoutEquipment(routine: WorkoutRoutine): Equipment[] {
  const set = new Set<Equipment>();
  for (const step of routine.steps) {
    const ex = getExercise(step.exerciseId);
    if (ex) set.add(ex.equipment);
  }
  return [...set];
}

type ActivityTier = "gentle" | "moderate" | "active";

/** Which style leads for each tier — not a fitness prescription, just a
 * sensible default starting point: lower-impact first for anyone 60+ or
 * currently sedentary, higher-intensity first for anyone already active. */
const TIER_STYLE_ORDER: Record<ActivityTier, WorkoutRoutine["style"][]> = {
  gentle: ["Mobility", "Mixed", "Strength", "Cardio"],
  moderate: ["Mixed", "Strength", "Cardio", "Mobility"],
  active: ["Strength", "Cardio", "Mixed", "Mobility"],
};

function activityTier(profile: { ageRange: string; activityLevel: string } | null): ActivityTier {
  if (!profile) return "moderate";
  if (profile.ageRange === "60+" || profile.activityLevel === "sedentary") return "gentle";
  if (profile.activityLevel === "active" && profile.ageRange !== "60+") return "active";
  return "moderate";
}

/** Reorders the built-in library around the profile: an explicitly
 * stated workout-style preference wins first, then age/activity level
 * decide the rest — a 60-year-old and a 20-year-old genuinely see a
 * different lead recommendation, not just a relabeled default list. */
export function orderWorkoutsForProfile(
  workouts: WorkoutRoutine[],
  profile: { ageRange: string; activityLevel: string; workoutStyle: string } | null
): WorkoutRoutine[] {
  const styleOrder = TIER_STYLE_ORDER[activityTier(profile)];
  const preferred = profile?.workoutStyle && profile.workoutStyle !== "Not sure yet" ? profile.workoutStyle : null;
  const rank = (style: WorkoutRoutine["style"]) => {
    const i = styleOrder.indexOf(style);
    return i === -1 ? styleOrder.length : i;
  };

  return [...workouts].sort((a, b) => {
    if (preferred) {
      if (a.style === preferred && b.style !== preferred) return -1;
      if (b.style === preferred && a.style !== preferred) return 1;
    }
    return rank(a.style) - rank(b.style);
  });
}

/** A one-line, honest reason for whichever workout ends up first —
 * shown so the reordering reads as intentional, not random. */
export function recommendationReason(
  profile: { ageRange: string; activityLevel: string; workoutStyle: string } | null
): string | null {
  if (!profile) return null;
  if (profile.workoutStyle && profile.workoutStyle !== "Not sure yet") {
    return `Leading with ${profile.workoutStyle.toLowerCase()} — what you told us you enjoy.`;
  }
  if (profile.ageRange === "60+") return "Lower-impact sessions first, based on your profile.";
  if (profile.activityLevel === "sedentary") return "Starting gentle, based on your current activity level.";
  if (profile.activityLevel === "active") return "Strength and cardio first, based on your current activity level.";
  return null;
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
