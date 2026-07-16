"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const PRESET_COLORS = ["#0d6b4f", "#1d4ed8", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#0891b2"];

export default function ThemeSettings() {
  const { business } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<"light" | "dark">(business?.theme?.mode || "light");
  const [color, setColor] = useState(business?.theme?.accentColor || "#0d6b4f");
  const [saving, setSaving] = useState(false);

  async function save(nextMode: "light" | "dark", nextColor: string) {
    if (!business?.id) return;
    setMode(nextMode);
    setColor(nextColor);
    setSaving(true);
    const toastId = toast.loading("Saving appearance…");
    try {
      await updateDoc(doc(db, "businesses", business.id), {
        theme: { mode: nextMode, accentColor: nextColor },
      });
      toast.success("Appearance updated", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to save", toastId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 mt-3">
      <div>
        <p className="text-sm font-medium mb-2">Mode</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => save("light", color)}
            className={`rounded-xl border py-2.5 text-sm font-medium ${mode === "light" ? "border-bamyon-green bg-bamyon-green/5" : "border-black/10"}`}
          >
            ☀️ Light
          </button>
          <button
            onClick={() => save("dark", color)}
            className={`rounded-xl border py-2.5 text-sm font-medium ${mode === "dark" ? "border-bamyon-green bg-bamyon-green/5" : "border-black/10"}`}
          >
            🌙 Dark
          </button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Accent color</p>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => save(mode, c)}
              className={`w-8 h-8 rounded-full border-2 ${color === c ? "border-black" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => save(mode, e.target.value)}
            className="w-8 h-8 rounded-full border border-black/10 cursor-pointer"
            title="Custom color"
          />
        </div>
        <p className="text-xs text-black/40 mt-2">Default is Bamyon green — pick any color to make it yours.</p>
      </div>
      {saving && <p className="text-xs text-black/40">Saving…</p>}
    </div>
  );
}
