export type DietTag = "Vegetarian" | "Vegan" | "Gluten-free" | "Dairy-free";

export interface MealIdea {
  id: string;
  title: string;
  tag: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  description: string;
  ingredients: string[];
  steps: string[];
  /** What this recipe, as written, actually satisfies — used to sort
   * ideas toward whatever the profile's real dietary restrictions are,
   * never to silently hide the rest. */
  dietTags: DietTag[];
}

/** A small, real, curated set of meal ideas with actual recipes and
 * honest macro estimates — a fallback for "what should I eat" that
 * doesn't require a photo, distinct from the AI-analyzed meal log and
 * fridge-photo recipe finder. Not a measurement of anything you ate. */
export const MEAL_IDEAS: MealIdea[] = [
  {
    id: "greek-yogurt-bowl",
    title: "Greek Yogurt Berry Bowl",
    tag: "Breakfast",
    kcal: 320,
    proteinG: 28,
    carbsG: 32,
    fatG: 9,
    description: "High-protein, ready in 3 minutes — a strong default when you're rushed.",
    ingredients: ["1 cup plain Greek yogurt", "1/2 cup mixed berries", "2 tbsp walnuts", "1 tsp honey"],
    steps: ["Spoon yogurt into a bowl.", "Top with berries and walnuts.", "Drizzle with honey."],
    dietTags: ["Vegetarian", "Gluten-free"],
  },
  {
    id: "veggie-scramble",
    title: "Veggie Egg Scramble",
    tag: "Breakfast",
    kcal: 380,
    proteinG: 24,
    carbsG: 12,
    fatG: 24,
    description: "Whatever vegetables are about to go bad — this uses them up.",
    ingredients: ["3 eggs", "1 cup chopped vegetables (spinach, pepper, onion)", "1 tsp olive oil", "Salt and pepper"],
    steps: [
      "Heat oil in a pan over medium heat.",
      "Sauté vegetables 3-4 minutes until soft.",
      "Add beaten eggs, stir gently until just set.",
      "Season and serve.",
    ],
    dietTags: ["Vegetarian", "Gluten-free", "Dairy-free"],
  },
  {
    id: "chicken-rice-bowl",
    title: "Chicken & Rice Bowl",
    tag: "Lunch",
    kcal: 520,
    proteinG: 42,
    carbsG: 55,
    fatG: 12,
    description: "Meal-prep friendly — make four at once on a Sunday.",
    ingredients: ["6 oz grilled chicken breast", "3/4 cup cooked rice", "1 cup steamed broccoli", "1 tbsp soy sauce"],
    steps: ["Slice the chicken.", "Layer rice, broccoli, and chicken in a bowl.", "Drizzle with soy sauce."],
    dietTags: ["Dairy-free"],
  },
  {
    id: "lentil-soup",
    title: "Lentil & Vegetable Soup",
    tag: "Lunch",
    kcal: 340,
    proteinG: 20,
    carbsG: 48,
    fatG: 6,
    description: "Fiber-heavy and filling — freezes well for busy weeks.",
    ingredients: ["1 cup red lentils", "1 diced carrot", "1 diced celery stalk", "4 cups vegetable broth", "1 tsp cumin"],
    steps: ["Sauté carrot and celery 5 minutes.", "Add lentils, broth, and cumin.", "Simmer 20 minutes until lentils are soft."],
    dietTags: ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free"],
  },
  {
    id: "salmon-sweet-potato",
    title: "Salmon & Roasted Sweet Potato",
    tag: "Dinner",
    kcal: 560,
    proteinG: 38,
    carbsG: 42,
    fatG: 24,
    description: "Omega-3s and a real vegetable side, no complicated technique.",
    ingredients: ["6 oz salmon fillet", "1 medium sweet potato, cubed", "1 tbsp olive oil", "1 cup green beans"],
    steps: [
      "Roast sweet potato at 400°F for 20 minutes.",
      "Season salmon, pan-sear 4 minutes per side.",
      "Steam green beans 5 minutes.",
      "Plate together.",
    ],
    dietTags: ["Gluten-free", "Dairy-free"],
  },
  {
    id: "tofu-stir-fry",
    title: "Tofu Vegetable Stir-Fry",
    tag: "Dinner",
    kcal: 410,
    proteinG: 26,
    carbsG: 38,
    fatG: 16,
    description: "A reliable plant-based dinner that still hits a real protein number.",
    ingredients: ["8 oz firm tofu, cubed", "2 cups mixed stir-fry vegetables", "2 tbsp stir-fry sauce", "1/2 cup cooked rice"],
    steps: [
      "Pan-fry tofu until golden, set aside.",
      "Stir-fry vegetables 4-5 minutes.",
      "Return tofu, add sauce, toss to coat.",
      "Serve over rice.",
    ],
    dietTags: ["Vegetarian", "Vegan", "Dairy-free"],
  },
  {
    id: "apple-almond-butter",
    title: "Apple with Almond Butter",
    tag: "Snack",
    kcal: 220,
    proteinG: 6,
    carbsG: 26,
    fatG: 12,
    description: "Fiber plus healthy fat — a steadier blood-sugar response than juice or crackers.",
    ingredients: ["1 medium apple, sliced", "2 tbsp almond butter"],
    steps: ["Slice the apple.", "Serve with almond butter for dipping."],
    dietTags: ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free"],
  },
  {
    id: "cottage-cheese-pineapple",
    title: "Cottage Cheese & Pineapple",
    tag: "Snack",
    kcal: 180,
    proteinG: 20,
    carbsG: 16,
    fatG: 3,
    description: "An underrated high-protein snack that actually keeps you full.",
    ingredients: ["3/4 cup cottage cheese", "1/2 cup pineapple chunks"],
    steps: ["Combine in a bowl and serve chilled."],
    dietTags: ["Vegetarian", "Gluten-free"],
  },
];
