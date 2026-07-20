import { callAnthropicTool, hasAnthropicKey, type AnthropicTool } from "@/lib/ai/anthropic";

const TURN_TOOL: AnthropicTool = {
  name: "onboarding_turn",
  description:
    "Decide how to respond to what someone just said during onboarding intake: a brief acknowledgment, or — when their answer actually reveals something specific and worth understanding — an acknowledgment plus one real follow-up question.",
  input_schema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description:
          "Plain text, no markdown, no quotation marks. If askFollowUp is false: one short, warm, specific acknowledgment of what they said (never generic, never 'noted' or 'got it'). If askFollowUp is true: that same acknowledgment, immediately followed by ONE specific, genuinely curious follow-up question about what they just said — not the next scripted topic.",
      },
      askFollowUp: {
        type: "boolean",
        description:
          "True only if their answer contains something specific enough to be worth a real follow-up (a named injury, an unusual pattern, a strong stress signal, something that contradicts an earlier answer). False for routine, unremarkable answers — most answers should be false.",
      },
    },
    required: ["message", "askFollowUp"],
  },
};

const FALLBACKS = [
  "Got it — noted.",
  "Thanks for telling me that.",
  "That's helpful to know.",
  "Good to know, thank you.",
  "Appreciate you sharing that.",
];

interface TurnRequestBody {
  question?: string;
  answer?: string;
  name?: string;
  priorAnswers?: string[];
}

/**
 * The onboarding conversation's one AI-driven moment: instead of always
 * just affirming an answer and reciting the next scripted question, the
 * model can choose to actually dig in — a real follow-up grounded in what
 * was just said, not a canned line. Most answers still just get a warm,
 * specific acknowledgment; askFollowUp is deliberately the exception, not
 * the rule, so it reads as genuine attention rather than a gimmick that
 * fires every turn. Never errors to the caller — falls back to a plain
 * acknowledgment (never a fake follow-up) if there's no API key or the
 * call fails, so onboarding always keeps moving.
 */
export async function POST(request: Request) {
  let body: TurnRequestBody;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { question, answer, name, priorAnswers } = body;

  if (!question || !answer) {
    return Response.json({ message: FALLBACKS[0], askFollowUp: false, usedAI: false });
  }

  if (!hasAnthropicKey()) {
    const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    return Response.json({ message: fallback, askFollowUp: false, usedAI: false });
  }

  const context = priorAnswers?.length ? ` Earlier in this conversation they also told you: ${priorAnswers.join(" | ")}.` : "";

  try {
    const result = await callAnthropicTool<{ message: string; askFollowUp: boolean }>(
      `You are a warm, motivational-interviewing-style wellness coach meeting ${name || "someone new"} for the first time during onboarding intake. You just asked: "${question}" — they answered: "${answer}".${context} Decide whether this specific answer warrants one real follow-up question before moving on, using the onboarding_turn tool.`,
      TURN_TOOL
    );
    return Response.json({ message: result.message, askFollowUp: !!result.askFollowUp, usedAI: true });
  } catch {
    const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    return Response.json({ message: fallback, askFollowUp: false, usedAI: false });
  }
}
