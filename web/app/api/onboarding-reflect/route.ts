import { callAnthropicTool } from "@/lib/ai/anthropic";

const REFLECT_TOOL = {
  name: "reflect",
  description: "A single short, warm, motivational-interviewing-style reflection acknowledging what the person just said.",
  input_schema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "One short sentence, plain text, no markdown, no question — just a genuine acknowledgment.",
      },
    },
    required: ["message"],
  },
};

const FALLBACKS = [
  "Got it — noted.",
  "Thanks for telling me that.",
  "That's helpful to know.",
  "Good to know, thank you.",
  "Appreciate you sharing that.",
];

interface ReflectRequestBody {
  question?: string;
  answer?: string;
  name?: string;
}

/**
 * A single-purpose, low-stakes AI call: reflect back what someone just
 * answered during onboarding, MI-style, so the intake feels like an
 * actual conversation instead of a form. Never errors to the caller —
 * falls back to a plain scripted acknowledgment if there's no API key or
 * the call fails, so onboarding always keeps moving.
 */
export async function POST(request: Request) {
  let body: ReflectRequestBody;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { question, answer, name } = body;

  if (!question || !answer) {
    return Response.json({ message: FALLBACKS[0], usedAI: false });
  }

  try {
    const result = await callAnthropicTool<{ message: string }>(
      `You are a warm, motivational-interviewing-style wellness coach meeting ${name || "someone new"} for the first time during onboarding. You just asked: "${question}" — they answered: "${answer}". Reflect back what they said in one short, warm sentence. No advice, no next question, just a genuine, specific acknowledgment, the way a good coach would respond in the moment. Plain text, no markdown, no quotation marks.`,
      REFLECT_TOOL
    );
    return Response.json({ message: result.message, usedAI: true });
  } catch {
    const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    return Response.json({ message: fallback, usedAI: false });
  }
}
