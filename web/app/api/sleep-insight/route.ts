import { callOpenAIText } from "@/lib/ai/openai";
import { callAnthropicTool, hasAnthropicKey, type AnthropicTool } from "@/lib/ai/anthropic";
import { SCOPE_TEXT } from "@/lib/ai/safety";

interface SleepInsightBody {
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
  restingHeartRate?: number;
  bedtime?: string;
  wakeTime?: string;
  disruptors?: string[];
  caffeineAfter?: string;
  energyToday?: "low" | "moderate" | "high";
}

interface SleepInsightResult {
  headline: string;
  explanation: string;
}

const SLEEP_INSIGHT_TOOL: AnthropicTool = {
  name: "format_sleep_insight",
  description: "Structure a causal sleep diagnosis into a headline and one supporting sentence.",
  input_schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description: "A single plain sentence naming the most likely real cause, <=18 words. E.g. 'Low deep sleep plus a late coffee is the likely reason today feels low-energy.'",
      },
      explanation: {
        type: "string",
        description: "One supporting sentence with the specific mechanism or number behind the headline.",
      },
    },
    required: ["headline", "explanation"],
  },
};

function mockInsight(body: SleepInsightBody): SleepInsightResult {
  const total = body.deepMinutes + body.remMinutes + body.lightMinutes;
  const deepPct = total ? Math.round((body.deepMinutes / total) * 100) : 0;
  return {
    headline: `[MOCK] Deep sleep at ${deepPct}% of total is on the low side — that's the likeliest driver today.`,
    explanation:
      "[MOCK] Set OPENAI_API_KEY and ANTHROPIC_API_KEY for a real diagnostic grounded in your actual entry.",
  };
}

export async function POST(request: Request) {
  let body: SleepInsightBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!hasAnthropicKey() || !process.env.OPENAI_API_KEY) {
    return Response.json({ insight: mockInsight(body), usedRealAI: false });
  }

  const systemPrompt = [
    SCOPE_TEXT,
    "You are reasoning about one night of self-reported sleep data to explain why the person might feel low-energy today. Be specific and causal, cite the actual numbers given, and never invent a stage or number not provided. If nothing meaningfully explains it, say so plainly rather than forcing an answer.",
  ].join(" ");

  const userMessage = [
    `Deep sleep: ${body.deepMinutes} min. REM: ${body.remMinutes} min. Light: ${body.lightMinutes} min. Awake: ${body.awakeMinutes} min.`,
    body.restingHeartRate ? `Resting heart rate: ${body.restingHeartRate} bpm.` : "",
    body.bedtime && body.wakeTime ? `Bedtime ${body.bedtime}, wake ${body.wakeTime}.` : "",
    body.caffeineAfter ? `Last caffeine: ${body.caffeineAfter}.` : "",
    body.disruptors?.length ? `Reported disruptors: ${body.disruptors.join(", ")}.` : "",
    body.energyToday ? `Self-reported energy today: ${body.energyToday}.` : "",
    "Explain the most likely real cause of today's energy level from this data.",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const { text } = await callOpenAIText(systemPrompt, userMessage, { allowWebSearch: false });
    const insight = await callAnthropicTool<SleepInsightResult>(
      `Structure this sleep diagnosis into the format_sleep_insight tool:\n\n${text}`,
      SLEEP_INSIGHT_TOOL
    );
    return Response.json({ insight, usedRealAI: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Sleep insight failed" },
      { status: 502 }
    );
  }
}
