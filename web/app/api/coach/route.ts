import { callOpenAIText } from "@/lib/ai/openai";
import { checkLocalRedFlags, containsEscalationLanguage, MI_STYLE_TEXT, SCOPE_TEXT } from "@/lib/ai/safety";
import type { SafetyProfile } from "@/lib/ai/safety";
import { TONE_SYSTEM_PROMPT, INTENSITY_SYSTEM_PROMPT, type CoachTone, type ContentIntensity, type CoachLanguage } from "@/lib/profile";

interface ChatTurn {
  role: "user" | "coach";
  content: string;
}

interface CoachRequestBody {
  message: string;
  history?: ChatTurn[];
  profile?: SafetyProfile;
  allowWebSearch?: boolean;
  /** A plain-text summary of the person's actually-logged data (sleep,
   * meals, workouts, mind check-ins) — grounds the reply in real numbers
   * instead of a generic opener. */
  context?: string;
  tone?: CoachTone;
  intensity?: ContentIntensity;
  language?: CoachLanguage;
}

export async function POST(request: Request) {
  let body: CoachRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (!message) {
    return Response.json({ error: "Missing message" }, { status: 400 });
  }

  const localFlag = checkLocalRedFlags(body.profile || {});
  if (localFlag) {
    return Response.json({ escalation: true, reply: localFlag });
  }

  const systemPrompt = [
    SCOPE_TEXT,
    "",
    MI_STYLE_TEXT,
    "",
    TONE_SYSTEM_PROMPT[body.tone || "warm"],
    INTENSITY_SYSTEM_PROMPT[body.intensity || "standard"],
    "",
    "This app tracks four domains: Sleep & Recovery, Nutrition, Fitness & Movement, and Mind & Purpose. Answer inside that scope.",
    body.language && body.language !== "English"
      ? `Write your entire reply in ${body.language}, regardless of what language the user's message or logged data is in.`
      : "",
    body.context ? `\nWhat this person has actually logged recently:\n${body.context}` : "",
  ].join("\n");

  const transcript = (body.history || [])
    .slice(-8)
    .map((t) => `${t.role === "user" ? "User" : "Coach"}: ${t.content}`)
    .join("\n");
  const userMessage = transcript ? `${transcript}\nUser: ${message}\nCoach:` : message;

  try {
    const { text, usedWebSearch } = await callOpenAIText(systemPrompt, userMessage, {
      allowWebSearch: body.allowWebSearch,
    });
    const cleaned = text.trim();
    if (containsEscalationLanguage(cleaned)) {
      return Response.json({ escalation: true, reply: cleaned });
    }
    return Response.json({ escalation: false, reply: cleaned, usedWebSearch });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Coach request failed" },
      { status: 502 }
    );
  }
}
