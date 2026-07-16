const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || "tts-1";
const TTS_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

interface SpeechRequestBody {
  text: string;
  voice?: string;
  speed?: number;
}

/**
 * Real neural TTS via OpenAI's audio/speech endpoint, ported from the
 * original app's Netlify function. Runs server-side — the key never
 * reaches the browser. Returns 204 (no body) when unavailable so the
 * client can fall back to the browser's built-in speechSynthesis instead
 * of treating this as a hard failure.
 */
export async function POST(request: Request) {
  let body: SpeechRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const text = (body.text || "").trim();
  if (!text) {
    return new Response("Missing text", { status: 400 });
  }
  const voice = TTS_VOICES.includes(body.voice || "") ? (body.voice as string) : "nova";
  const speed = typeof body.speed === "number" && body.speed >= 0.7 && body.speed <= 1.2 ? body.speed : 1.0;
  const clipped = text.length > 3000 ? text.slice(0, 3000) : text;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(null, { status: 204, headers: { "X-TTS-Status": "no_api_key" } });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: OPENAI_TTS_MODEL, voice, input: clipped, response_format: "mp3", speed }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI TTS ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return new Response(arrayBuffer, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "X-TTS-Voice": voice, "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 204, headers: { "X-TTS-Status": "error" } });
  }
}
