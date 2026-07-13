import { callOpenAIVision, hasOpenAIKey } from "@/lib/ai/openai";
import { callAnthropicTool, hasAnthropicKey, type AnthropicTool } from "@/lib/ai/anthropic";

interface NutritionRequestBody {
  imageDataUrl: string;
  note?: string;
}

interface MealFood {
  name: string;
  estimated_grams: number | null;
  estimated_calories: number | null;
}

interface MealResult {
  foods: MealFood[];
  total_calories_estimate: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  suggestion: string;
  confidence: "low" | "moderate";
}

const MEAL_FORMAT_TOOL: AnthropicTool = {
  name: "format_meal",
  description:
    "Structure a meal-photo analysis for a UI card. Restructuring only — never invent a food that wasn't actually described as visible in the photo.",
  input_schema: {
    type: "object",
    properties: {
      foods: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            estimated_grams: { type: ["number", "null"] },
            estimated_calories: { type: ["number", "null"] },
          },
          required: ["name", "estimated_grams", "estimated_calories"],
        },
      },
      total_calories_estimate: { type: ["number", "null"] },
      protein_g: { type: ["number", "null"] },
      carbs_g: { type: ["number", "null"] },
      fat_g: { type: ["number", "null"] },
      suggestion: {
        type: "string",
        description:
          "One specific, grounded suggestion tied to a real mechanism (fiber/gut microbiome, protein/satiety signaling, etc.) relevant to what is actually in the photo — never generic ('eat healthier').",
      },
      confidence: {
        type: "string",
        enum: ["low", "moderate"],
        description:
          "Photo-based portion/calorie estimates are never high-confidence. 'moderate' only for a clear, well-lit, single-plate photo with recognizable, common portions; 'low' otherwise.",
      },
    },
    required: ["foods", "total_calories_estimate", "protein_g", "carbs_g", "fat_g", "suggestion", "confidence"],
  },
};

function buildMealPrompt(note?: string): string {
  return [
    "Look at this meal photo. Identify each distinct food you can actually see — do not guess at things you can't see.",
    "For each food, estimate a typical serving weight in grams and calories, based on common portion sizes and standard nutrition data. State plainly these are visual estimates, not a food-scale measurement.",
    "Estimate total calories and protein/carbs/fat in grams for the whole plate.",
    "Give one specific, mechanism-grounded suggestion relevant to what's actually on the plate (e.g. a fiber/gut-microbiome or protein/satiety point), never a generic 'eat healthier'.",
    note ? `The user added this note: "${note}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function mockMeal(): MealResult {
  return {
    foods: [
      { name: "[MOCK] Grilled chicken breast", estimated_grams: 140, estimated_calories: 230 },
      { name: "[MOCK] Steamed white rice", estimated_grams: 150, estimated_calories: 195 },
      { name: "[MOCK] Broccoli", estimated_grams: 80, estimated_calories: 28 },
    ],
    total_calories_estimate: 453,
    protein_g: 38,
    carbs_g: 45,
    fat_g: 6,
    suggestion:
      "[MOCK] Set OPENAI_API_KEY and ANTHROPIC_API_KEY for a real, photo-grounded estimate and suggestion.",
    confidence: "low",
  };
}

export async function POST(request: Request) {
  let body: NutritionRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.imageDataUrl || !body.imageDataUrl.startsWith("data:image/")) {
    return Response.json({ error: "Missing or invalid image" }, { status: 400 });
  }

  if (!hasOpenAIKey()) {
    return Response.json({ meal: mockMeal(), usedRealAI: false });
  }

  let stage1Text: string;
  try {
    stage1Text = await callOpenAIVision(buildMealPrompt(body.note), body.imageDataUrl);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Photo analysis failed" },
      { status: 502 }
    );
  }

  if (!hasAnthropicKey()) {
    return Response.json({
      meal: { ...mockMeal(), suggestion: stage1Text.slice(0, 240) },
      usedRealAI: true,
      note: "Vision analysis is real; structuring fell back to a mock shape because ANTHROPIC_API_KEY is not set.",
    });
  }

  try {
    const meal = await callAnthropicTool<MealResult>(
      `Restructure this meal analysis into the format_meal tool. Never add a food that isn't mentioned.\n\n${stage1Text}`,
      MEAL_FORMAT_TOOL
    );
    return Response.json({ meal, usedRealAI: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Structuring the result failed" },
      { status: 502 }
    );
  }
}
