"use client";

import { useAuth } from "@/contexts/AuthContext";

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Tailwind's bg-bamyon-green/5 style opacity shorthand needs a plain
// "R G B" triplet in the CSS variable, not a hex string or rgb() wrapper.
function hexToRgbTriplet(hex: string): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `${r} ${g} ${b}`;
}

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { business } = useAuth();
  const accent = business?.theme?.accentColor || "#0d6b4f";
  const isDark = business?.theme?.mode === "dark";

  return (
    <div
      className={isDark ? "dark" : ""}
      style={{
        // @ts-ignore custom properties
        "--color-accent-rgb": hexToRgbTriplet(accent),
        "--color-accent-dark-rgb": hexToRgbTriplet(darken(accent, 25)),
      }}
    >
      {children}
    </div>
  );
}
