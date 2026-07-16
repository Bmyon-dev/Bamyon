"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastKind = "loading" | "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastContextValue {
  /** Fire a toast and forget it — auto-dismisses after ~3.5s (loading stays until updated/removed). */
  loading: (text: string) => number;
  success: (text: string, id?: number) => void;
  error: (text: string, id?: number) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, text: string, replaceId?: number) => {
    const id = replaceId ?? nextId++;
    setToasts((prev) => {
      const withoutOld = prev.filter((t) => t.id !== id);
      return [...withoutOld, { id, kind, text }];
    });
    if (kind !== "loading") {
      setTimeout(() => dismiss(id), 3500);
    }
    return id;
  }, [dismiss]);

  const loading = useCallback((text: string) => push("loading", text), [push]);
  const success = useCallback((text: string, id?: number) => push("success", text, id), [push]);
  const error = useCallback((text: string, id?: number) => push("error", text, id), [push]);

  return (
    <ToastContext.Provider value={{ loading, success, error, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-sm w-full sm:w-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg animate-[slideIn_0.15s_ease-out] ${
              t.kind === "success"
                ? "bg-bamyon-green text-white"
                : t.kind === "error"
                ? "bg-red-600 text-white"
                : "bg-black text-white"
            }`}
          >
            {t.kind === "loading" && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
            )}
            {t.kind === "success" && <span>✓</span>}
            {t.kind === "error" && <span>✕</span>}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
