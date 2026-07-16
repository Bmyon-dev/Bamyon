"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildLogoPromptUrl, LOGO_STYLES } from "@/lib/pollinations";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

export default function AiLogoGenerator() {
  const { business } = useAuth();
  const toast = useToast();
  const [style, setStyle] = useState(LOGO_STYLES[0]);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function generate() {
    if (!business?.name) return;
    setGenerating(true);
    const newSeed = Math.floor(Math.random() * 100000);
    setSeed(newSeed);
    const url = buildLogoPromptUrl(business.name, style, newSeed);
    setPreviewUrl(url);
  }

  async function useThisLogo() {
    if (!business?.id || !previewUrl) return;
    setSaving(true);
    const toastId = toast.loading("Saving your new logo…");
    try {
      await updateDoc(doc(db, "businesses", business.id), { logoUrl: previewUrl });
      toast.success("Logo saved", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to save logo", toastId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-black/60">
        Generate a free logo with AI, based on your business name — no design
        skills or budget needed.
      </p>

      <div className="flex flex-wrap gap-2">
        {LOGO_STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStyle(s)}
            className={`text-xs rounded-full px-3 py-1.5 border ${
              style === s ? "border-bamyon-green bg-bamyon-green/10 text-bamyon-green" : "border-black/10 text-black/50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <button type="button" onClick={generate} disabled={generating} className="btn-secondary text-sm px-4 py-2">
        ✨ Generate Logo
      </button>

      {previewUrl && (
        <div className="flex items-center gap-4 mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Generated logo preview"
            className="w-24 h-24 rounded-xl object-cover border border-black/10"
            onLoad={() => setGenerating(false)}
          />
          <div className="space-y-2">
            {business?.logoUrl === previewUrl ? (
              <p className="text-bamyon-green text-sm font-medium">✓ This is your current logo</p>
            ) : (
              <button onClick={useThisLogo} disabled={saving} className="btn-primary text-sm px-4 py-2">
                {saving ? "Saving…" : "Use this logo"}
              </button>
            )}
            <button onClick={generate} className="text-black/50 text-xs block">
              Try another →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
