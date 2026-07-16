export interface ExtractedItem {
  name: string;
  qty: number;
  price: number;
}

export interface ExtractedReceipt {
  items: ExtractedItem[];
  counterpartyName?: string; // customer (sale) or supplier (purchase)
}

/**
 * Sends a photo of a receipt / handwritten sales sheet to Pollinations.ai's
 * free, keyless vision endpoint and asks for strict JSON back. This is a
 * best-effort read, not OCR-perfect — the result always lands in the form
 * fields for a human to review and correct before saving, never auto-saved.
 */
export async function extractReceiptData(
  base64Image: string,
  kind: "sale" | "purchase"
): Promise<ExtractedReceipt> {
  const noun = kind === "sale" ? "customer" : "supplier";
  const prompt =
    `You are reading a photo of a Nigerian small business's ${kind === "sale" ? "sales receipt" : "purchase/supplier invoice"}. ` +
    `Extract every line item you can read. Respond with ONLY raw JSON, no markdown fences, no explanation, in exactly this shape: ` +
    `{"items":[{"name":"string","qty":number,"price":number}],"counterpartyName":"string or empty"}. ` +
    `"price" is the unit price in Naira as a plain number (no currency symbol, no commas). "counterpartyName" is the ${noun}'s name if visible, otherwise an empty string. ` +
    `If you truly cannot read anything, return {"items":[],"counterpartyName":""}.`;

  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: base64Image } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error("AI scanning is unavailable right now — please enter items manually.");
  }

  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content || "";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Couldn't read that image clearly — please enter items manually.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Couldn't understand what was in that image — please enter items manually.");
  }

  const items: ExtractedItem[] = Array.isArray(parsed.items)
    ? parsed.items
        .filter((it: any) => it && it.name)
        .map((it: any) => ({
          name: String(it.name).slice(0, 80),
          qty: Math.max(1, Number(it.qty) || 1),
          price: Math.max(0, Number(it.price) || 0),
        }))
    : [];

  if (items.length === 0) {
    throw new Error("No items could be read from that image — please enter them manually.");
  }

  return {
    items,
    counterpartyName: typeof parsed.counterpartyName === "string" ? parsed.counterpartyName : "",
  };
}

/** Converts a File to a base64 data URL, the format the vision endpoint expects. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
