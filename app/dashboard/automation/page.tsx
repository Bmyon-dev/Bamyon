"use client";

import { useEffect, useState } from "react";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira, formatDate } from "@/lib/format";
import { AUTOMATION_ACTIVATION_PRICE, AutomationSettingsDoc } from "@/lib/types";
import { activateAutomationClientSide, updateAutomationSettingsClientSide } from "@/lib/automationActions";

export default function AutomationPage() {
  const { business } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<AutomationSettingsDoc | null>(null);
  const [hasGBP, setHasGBP] = useState<"unanswered" | "yes" | "no">("unanswered");
  const [link, setLink] = useState("");
  const [activating, setActivating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const balance = business?.walletBalance || 0;
  const canAfford = balance >= AUTOMATION_ACTIVATION_PRICE;

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      doc(db, "businesses", business.id, "automation", "config"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AutomationSettingsDoc;
          setSettings(data);
          setLink(data.googleReviewLink || "");
          if (data.googleReviewLink) setHasGBP("yes");
        }
      },
      toast.error,
      "Automation settings"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function handleActivate() {
    if (!business?.id) return;
    setError("");
    setActivating(true);
    const toastId = toast.loading("Activating review automation…");
    try {
      await activateAutomationClientSide(business.id, link);
      toast.success("Review automation activated 🎉", toastId);
    } catch (err: any) {
      const msg = err.message || "Activation failed";
      setError(msg);
      toast.error(msg, toastId);
    } finally {
      setActivating(false);
    }
  }

  async function handleUpdateLink() {
    if (!business?.id) return;
    setSaving(true);
    const toastId = toast.loading("Saving review link…");
    try {
      await updateAutomationSettingsClientSide(business.id, { googleReviewLink: link });
      toast.success("Review link updated", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to save", toastId);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!business?.id || !settings) return;
    const next = !settings.active;
    const toastId = toast.loading(next ? "Resuming automation…" : "Pausing automation…");
    try {
      await updateAutomationSettingsClientSide(business.id, { active: next });
      toast.success(next ? "Automation resumed" : "Automation paused", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update", toastId);
    }
  }

  const isActivated = settings?.activatedAt != null;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Review Automation</h1>
      <p className="text-black/50 mt-1">
        The moment you log a sale for a customer, they automatically get a WhatsApp/SMS
        message asking them to leave you a Google review — no extra tapping.
      </p>

      {isActivated ? (
        <div className="card p-5 mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-xs text-black/40">Activated {formatDate(settings?.activatedAt)}</p>
            </div>
            <button
              onClick={handleToggleActive}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 ${
                settings?.active ? "bg-bamyon-green/10 text-bamyon-green" : "bg-black/5 text-black/50"
              }`}
            >
              {settings?.active ? "Active — tap to pause" : "Paused — tap to resume"}
            </button>
          </div>

          <div>
            <label className="text-sm font-medium">Google Business review link</label>
            <input className="input mt-1" value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
          <button onClick={handleUpdateLink} disabled={saving} className="btn-secondary w-full">
            {saving ? "Saving…" : "Save link"}
          </button>
        </div>
      ) : hasGBP === "unanswered" ? (
        <div className="card p-5 mt-5 space-y-3">
          <h2 className="font-display font-bold">First — do you have a Google Business Profile?</h2>
          <p className="text-sm text-black/60">
            This is the free Google listing that shows your business on Maps and Search, and is where customer reviews live.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button onClick={() => setHasGBP("yes")} className="btn-primary text-sm">Yes, I have one</button>
            <button onClick={() => setHasGBP("no")} className="btn-secondary text-sm">No, not yet</button>
          </div>
        </div>
      ) : hasGBP === "no" ? (
        <div className="card p-5 mt-5 space-y-3">
          <h2 className="font-display font-bold">No problem — we'll set it up for you</h2>
          <p className="text-sm text-black/60">
            For {formatNaira(AUTOMATION_ACTIVATION_PRICE)}, Bamyon will walk you through creating your
            Google Business Profile. Once it's live, come back here to activate Review Automation.
          </p>
          <a href="/dashboard/support" className="btn-primary w-full text-center block">
            Message Customer Care to get started
          </a>
          <button onClick={() => setHasGBP("yes")} className="text-black/40 text-xs text-center w-full">
            Actually, I already have one →
          </button>
        </div>
      ) : (
        <div className="card p-5 mt-5 space-y-3">
          <h2 className="font-display font-bold">Activate for {formatNaira(AUTOMATION_ACTIVATION_PRICE)}</h2>
          <p className="text-sm text-black/60">
            One-time activation fee, paid from your wallet balance. Available on any plan.
          </p>
          <div>
            <label className="text-sm font-medium">Your Google Business review link</label>
            <input
              className="input mt-1"
              placeholder="https://g.page/r/your-business/review"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
          {!canAfford && (
            <p className="text-amber-700 text-sm">
              Your wallet balance is too low.{" "}
              <a href="/dashboard/wallet" className="underline font-medium">Fund your wallet</a> to continue.
            </p>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            onClick={handleActivate}
            disabled={activating || !canAfford || !link.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {activating && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {activating ? "Activating…" : `Activate — ${formatNaira(AUTOMATION_ACTIVATION_PRICE)}`}
          </button>
          <button onClick={() => setHasGBP("unanswered")} className="text-black/40 text-xs text-center w-full">
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
