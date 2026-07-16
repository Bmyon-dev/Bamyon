"use client";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Uploads a file straight from the browser to Cloudinary using an
 * unsigned upload preset (no server round-trip, no API secret exposed).
 * Returns the hosted image URL.
 *
 * Setup in Cloudinary console:
 *   Settings → Upload → Add upload preset → Signing Mode: "Unsigned"
 *   Copy the preset name and your cloud name into .env.local.
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary isn't configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local."
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || "Image upload failed");
  }

  const data = await res.json();
  return data.secure_url as string;
}
