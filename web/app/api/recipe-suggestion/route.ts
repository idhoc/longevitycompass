import { callOpenAIVision, hasOpenAIKey } from "@/lib/ai/openai";
import { callAnthropicTool, hasAnthropicKey, type AnthropicTool } from "@/lib/ai/anthropic";

interface RecipeRequestBody {
  imageDataUrl: string;
  note?: string;
}

interface RecipeResult {
  title: string;
  usesIngredients: string[];
  missingCommonItems: string[];
  steps: string[];
  estimatedMinutes: number | null;
  servings: number | null;
  confidence: "low" | "moderate";
}

const RECIPE_FORMAT_TOOL: AnthropicTool = {
  name: "format_recipe",
  description:
    "Structure an ingredient-photo recipe suggestion for a UI card. Restructuring only — never invent an ingredient that wasn't actually identified as visible in the photo.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short, concrete dish name." },
      usesIngredients: {
        type: "array",
        items: { type: "string" },
        description: "Ingredients actually visible in the photo that this recipe uses.",
      },
      missingCommonItems: {
        type: "array",
        items: { type: "string" },
        description:
          "Common pantry staples the recipe assumes (salt, oil, water) that weren't in the photo but are reasonable to assume. Keep short — do not invent ingredients the user must go buy.",
      },
      steps: {
        type: "array",
        items: { type: "string" },
        description: "4 to 8 concise, sequential cooking steps.",
      },
      estimatedMinutes: { type: ["number", "null"] },
      servings: { type: ["number", "null"] },
      confidence: {
        type: "string",
        enum: ["low", "moderate"],
        description: "'moderate' only for a clear, well-lit photo with clearly identifiable ingredients; 'low' otherwise.",
      },
    },
    required: ["title", "usesIngredients", "missingCommonItems", "steps", "estimatedMinutes", "servings", "confidence"],
  },
};

function buildRecipePrompt(note?: string): string {
  return [
    "Look at this photo of ingredients someone has on hand — not a plated meal, raw ingredients or a pantry/fridge.",
    "Identify each distinct ingredient you can actually see — do not guess at things you can't see.",
    "Propose ONE realistic, simple recipe built primarily around those ingredients. Only assume truly common staples (salt, pepper, cooking oil, water) if the recipe genuinely needs them — say so explicitly, don't assume anything else is available.",
    "Give 4 to 8 concise, sequential steps a home cook could actually follow, plus a rough total time and serving count.",
    note ? `The user added this note: "${note}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function mockRecipe(): RecipeResult {
  return {
    title: "[MOCK] Sheet-pan chicken and broccoli rice bowl",
    usesIngredients: ["[MOCK] Chicken breast", "[MOCK] Broccoli", "[MOCK] Rice"],
    missingCommonItems: ["Cooking oil", "Salt", "Pepper"],
    steps: [
      "[MOCK] Set OPENAI_API_KEY and ANTHROPIC_API_KEY for a real, photo-grounded recipe.",
      "Toss chicken and broccoli with oil, salt, and pepper on a sheet pan.",
      "Roast at 425°F for 18-20 minutes, until chicken reaches 165°F internally.",
      "Serve over cooked rice.",
    ],
    estimatedMinutes: 30,
    servings: 2,
    confidence: "low",
  };
}

export async function POST(request: Request) {
  let body: RecipeRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.imageDataUrl || !body.imageDataUrl.startsWith("data:image/")) {
    return Response.json({ error: "Missing or invalid image" }, { status: 400 });
  }

  if (!hasOpenAIKey()) {
    return Response.json({ recipe: mockRecipe(), usedRealAI: false });
  }

  let stage1Text: string;
  try {
    stage1Text = await callOpenAIVision(buildRecipePrompt(body.note), body.imageDataUrl);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Ingredient analysis failed" },
      { status: 502 }
    );
  }

  if (!hasAnthropicKey()) {
    return Response.json({
      recipe: {
        ...mockRecipe(),
        title: "Recipe idea",
        steps: [stage1Text.slice(0, 600)],
        confidence: "low" as const,
      },
      usedRealAI: true,
      note: "Ingredient analysis is real; structuring fell back to a mock shape because ANTHROPIC_API_KEY is not set.",
    });
  }

  try {
    const recipe = await callAnthropicTool<RecipeResult>(
      `Restructure this ingredient-photo recipe idea into the format_recipe tool. Never add an ingredient that isn't mentioned.\n\n${stage1Text}`,
      RECIPE_FORMAT_TOOL
    );
    return Response.json({ recipe, usedRealAI: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Structuring the result failed" },
      { status: 502 }
    );
  }
}
