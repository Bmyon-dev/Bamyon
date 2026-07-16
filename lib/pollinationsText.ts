/**
 * Pollinations.ai also serves free text generation — a GET request to this
 * URL returns plain text, no API key or account required.
 * https://pollinations.ai
 */
export async function amplifyText(rawText: string, context: string): Promise<string> {
  if (!rawText.trim()) return rawText;

  const prompt = `Rewrite the following message so it sounds clear, warm, and professional. Keep it roughly the same length, don't add quotation marks or a subject line, and don't explain what you changed. Context: ${context}. Message: "${rawText}"`;

  const res = await fetch(
    `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
    { method: "GET" }
  );

  if (!res.ok) {
    throw new Error("AI rewrite is unavailable right now — please try again.");
  }

  const text = await res.text();
  return text.trim() || rawText;
}
