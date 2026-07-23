import { callOpenAIText } from "@/lib/ai/openai";
import { MI_STYLE_TEXT } from "@/lib/ai/safety";

interface ChatTurn {
  role: "user" | "wren";
  content: string;
}

interface WrenChatBody {
  message: string;
  history?: ChatTurn[];
  /** Plain-text summary of today's mood/note and recent days, so replies
   * are grounded in what was actually written, not a generic opener. */
  context?: string;
}

const CRISIS_MESSAGE =
  "This sounds like more than a reflection check-in can hold. Please reach out to a crisis line or someone you trust right now — in the US, call or text 988. Wren isn't equipped for this, and neither is this app.";

const WREN_SCOPE_TEXT = [
  "You are Wren, a supportive companion inside the Mind & Purpose section of a longevity coaching app.",
  "You talk like a warm, grounded guidance counselor having a real back-and-forth conversation — never a clinician, never a therapist, and you say so plainly if asked. You cannot diagnose, treat, or provide therapy.",
  "Stay inside daily reflection: mood, stress, purpose, what's actually on their mind today. If the conversation drifts into something needing real therapy, medication, or crisis support, say plainly that this is outside what Wren can help with and point them to a licensed professional or a crisis line — do not attempt it yourself.",
].join(" ");

function mockReply(message: string): string {
  return `[MOCK] I heard: "${message.slice(0, 80)}". Set OPENAI_API_KEY for a real conversation with Wren.`;
}

const ESCALATION_MARKERS = ["crisis line", "licensed professional", "988", "real person", "outside what wren"];

function looksLikeEscalation(text: string): boolean {
  const lower = text.toLowerCase();
  return ESCALATION_MARKERS.some((marker) => lower.includes(marker));
}

// Checked locally, before any model call — the model is instructed to
// catch this too, but a crisis response should never depend on a single
// layer working correctly.
const SELF_HARM_MARKERS = ["kill myself", "end my life", "want to die", "suicid", "hurt myself", "self-harm", "self harm"];

function containsSelfHarmLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return SELF_HARM_MARKERS.some((marker) => lower.includes(marker));
}

export async function POST(request: Request) {
  let body: WrenChatBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (!message) {
    return Response.json({ error: "Missing message" }, { status: 400 });
  }

  if (containsSelfHarmLanguage(message)) {
    return Response.json({ escalation: true, reply: CRISIS_MESSAGE });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ escalation: false, reply: mockReply(message) });
  }

  const systemPrompt = [
    WREN_SCOPE_TEXT,
    "",
    MI_STYLE_TEXT,
    "",
    "Keep replies short — two or three sentences, like an actual spoken conversation, not an essay. End with one specific question or reflection that invites them to keep talking, unless they've clearly wrapped up.",
    "If what they write describes a mental health crisis, self-harm, or suicidal ideation, do not continue the conversation normally — respond only with a plain, direct statement that this needs a real person or a crisis line right now, nothing else.",
    body.context ? `\nWhat they've logged about today and recent days:\n${body.context}` : "",
  ].join("\n");

  const transcript = (body.history || [])
    .slice(-10)
    .map((t) => `${t.role === "user" ? "User" : "Wren"}: ${t.content}`)
    .join("\n");
  const userMessage = transcript ? `${transcript}\nUser: ${message}\nWren:` : message;

  try {
    const { text } = await callOpenAIText(systemPrompt, userMessage, { allowWebSearch: false });
    const cleaned = text.trim();
    if (looksLikeEscalation(cleaned)) {
      return Response.json({ escalation: true, reply: CRISIS_MESSAGE });
    }
    return Response.json({ escalation: false, reply: cleaned });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Wren request failed" },
      { status: 502 }
    );
  }
}
