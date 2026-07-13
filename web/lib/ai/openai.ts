const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_WEB_SEARCH_MODEL = process.env.OPENAI_WEB_SEARCH_MODEL || "gpt-4o";
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o";
const WEB_SEARCH_ENABLED = process.env.ENABLE_WEB_SEARCH !== "false";

export function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

interface ChatResult {
  text: string;
  usedWebSearch: boolean;
}

/**
 * Grounds a reply in real research. Tries OpenAI's hosted web search first
 * (restricted, by prompt, to a named allowlist of credible domains) and
 * falls back to a plain chat completion if that call fails for any reason
 * — a web-search API hiccup should never take the whole coach down.
 */
export async function callOpenAIText(
  systemPrompt: string,
  userMessage: string,
  opts?: { allowWebSearch?: boolean }
): Promise<ChatResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { text: mockReply(userMessage), usedWebSearch: false };
  }

  if (WEB_SEARCH_ENABLED && opts?.allowWebSearch !== false) {
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: OPENAI_WEB_SEARCH_MODEL,
          input: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          tools: [{ type: "web_search_preview" }],
          max_output_tokens: 700,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = extractResponsesText(data);
        if (text.trim()) return { text: text.trim(), usedWebSearch: true };
      }
    } catch {
      // fall through to the plain chat-completions call below
    }
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.6,
      max_tokens: 700,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return { text: (data.choices?.[0]?.message?.content || "").trim(), usedWebSearch: false };
}

export async function callOpenAIVision(prompt: string, imageDataUrl: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return mockVisionDescription();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      max_tokens: 700,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI vision ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractResponsesText(data: any): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text;
  const blocks = Array.isArray(data.output) ? data.output : [];
  for (const block of blocks) {
    const content = Array.isArray(block?.content) ? block.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text;
    }
  }
  return "";
}

function mockReply(userMessage: string): string {
  return `[MOCK — OPENAI_API_KEY not set] I'd ground a real answer to "${userMessage.slice(0, 80)}" in published research here. Set OPENAI_API_KEY to see it for real.`;
}

function mockVisionDescription(): string {
  return "[MOCK — OPENAI_API_KEY not set] A plate with a portion of grilled chicken, a cup of steamed rice, and a side of broccoli.";
}
