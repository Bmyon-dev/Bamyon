/**
 * Pollinations.ai is a free, keyless image generation API — a GET request
 * to this URL returns the image directly, so it can be used straight as
 * an <img src>. No account, no API key, no cost.
 * https://pollinations.ai
 */
export function buildLogoPromptUrl(businessName: string, style: string, seed: number): string {
  const prompt = `minimalist modern logo for a Nigerian small business called "${businessName}", ${style}, flat vector icon, clean, professional, centered, white background, no text`;
  const params = new URLSearchParams({
    width: "512",
    height: "512",
    nologo: "true",
    seed: String(seed),
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export const LOGO_STYLES = [
  "bold geometric shapes",
  "friendly rounded mascot icon",
  "elegant minimal monogram",
  "playful hand-drawn style",
  "modern gradient badge",
];
