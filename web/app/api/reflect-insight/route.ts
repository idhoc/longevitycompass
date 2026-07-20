import { callOpenAIText } from "@/lib/ai/openai";
import { callAnthropicTool, hasAnthropicKey, type AnthropicTool } from "@/lib/ai/anthropic";
import { MI_STYLE_TEXT, SCOPE_TEXT } from "@/lib/ai/safety";

interface ReflectHistoryEntry {
  mood: string;
  note?: string;
}

interface ReflectInsightBody {
  prompt: string;
  mood: string;
  note: string;
  recentHistory?: ReflectHistoryEntry[];
}

interface ReflectInsightResult {
  headline: string;
  explanation: string;
  escalation: boolean;
}

const CRISIS_MESSAGE =
  "This sounds like more than a daily check-in can hold. Please reach out to a crisis line or someone you trust right now — in the US, call or text 988. This app can't help with what you're describing.";

const REFLECT_TOOL: AnthropicTool = {
  name: "format_reflection",
  description: "Structure a reflection on someone's daily journal entry into a headline and one supporting sentence.",
  input_schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description: "One plain sentence that reflects back something specific from what they actually wrote — never generic. <=20 words.",
      },
      explanation: {
        type: "string",
        description: "One supporting sentence — a pattern noticed across entries, a gentle question, or a specific small next step. Never therapy-speak.",
      },
      escalation: {
        type: "boolean",
        description: "True only if the note describes a mental health crisis, self-harm, or suicidal ideation.",
      },
    },
    required: ["headline", "explanation", "escalation"],
  },
};

function mockInsight(body: ReflectInsightBody): ReflectInsightResult {
  return {
    headline: `[MOCK] Noted: "${body.note.slice(0, 60)}"`,
    explanation: "[MOCK] Set OPENAI_API_KEY and ANTHROPIC_API_KEY for a real reflection grounded in what you wrote.",
    escalation: false,
  };
}

export async function POST(request: Request) {
  let body: ReflectInsightBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.note?.trim()) {
    return Response.json({ error: "Missing note" }, { status: 400 });
  }

  if (!hasAnthropicKey() || !process.env.OPENAI_API_KEY) {
    return Response.json({ insight: mockInsight(body), usedRealAI: false });
  }

  const systemPrompt = [
    SCOPE_TEXT,
    MI_STYLE_TEXT,
    "You're responding to one journal-style reflection entry, not a conversation — there's no back-and-forth, so make this single response count.",
    "If the note describes a mental health crisis, self-harm, or suicidal ideation, set escalation to true and make the headline and explanation together say plainly that this needs a real person or a crisis line, not this app — nothing else.",
  ].join(" ");

  const historyLine = body.recentHistory?.length
    ? `Recent days, for pattern context only: ${body.recentHistory
        .map((h) => `${h.mood}${h.note ? ` ("${h.note.slice(0, 80)}")` : ""}`)
        .join("; ")}.`
    : "";

  const userMessage = [
    `Today's prompt was: "${body.prompt}"`,
    `They rated today's mood as: ${body.mood}.`,
    `What they wrote: "${body.note}"`,
    historyLine,
    "Reflect back something specific from what they actually wrote, then offer one small grounded observation or question — not generic advice.",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const { text } = await callOpenAIText(systemPrompt, userMessage, { allowWebSearch: false });
    const insight = await callAnthropicTool<ReflectInsightResult>(
      `Structure this reflection into the format_reflection tool:\n\n${text}`,
      REFLECT_TOOL
    );
    if (insight.escalation) {
      insight.headline = "This is outside what a journal check-in can help with";
      insight.explanation = CRISIS_MESSAGE;
    }
    return Response.json({ insight, usedRealAI: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Reflection failed" },
      { status: 502 }
    );
  }
}
