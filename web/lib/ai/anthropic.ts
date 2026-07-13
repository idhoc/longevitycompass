const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

export function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/**
 * Forced tool-use, not "please reply with JSON as text" — that pattern is
 * fragile (any stray formatting from stage 1 can break a naive JSON.parse).
 * Tool-use makes the Anthropic API itself guarantee a schema-valid object,
 * so there's no string to parse or fail on. Throws on missing key so the
 * caller decides its own mock-mode fallback shape.
 */
export async function callAnthropicTool<T>(
  instruction: string,
  tool: AnthropicTool
): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      temperature: 0.4,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: instruction }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolUse = (data.content || []).find((b: any) => b.type === "tool_use" && b.name === tool.name);
  if (!toolUse || !toolUse.input) {
    throw new Error("No tool_use block returned");
  }
  return toolUse.input as T;
}
