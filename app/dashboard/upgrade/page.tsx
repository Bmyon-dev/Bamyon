"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { BillingCycle, PLAN_FEATURES, PLAN_LABELS, PLAN_PRICES, PaidPlanId } from "@/lib/types";
import { formatNaira, formatDate, isPlanActive } from "@/lib/format";
import { upgradePlanClientSide } from "@/lib/upgradeActions";

const CYCLES: { id: BillingCycle; label: string; note?: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "6months", label: "6 Months" },
  { id: "yearly", label: "Yearly", note: "2 months free!" },
];

const SELF_SERVE_PLANS: PaidPlanId[] = ["standard", "premium", "premium_pro"];

export default function UpgradePage() {
  const { business } = useAuth();
  const toast = useToast();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [selected, setSelected] = useState<PaidPlanId>("standard");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const activePlan = business && isPlanActive(business.planExpiry) ? business.plan : "free";
  const cost = PLAN_PRICES[selected][cycle];
  const balance = business?.walletBalance || 0;
  const canAfford = balance >= cost;

  async function handleUpgrade() {
    if (!business?.id) return;
    setError("");
    setSuccess(null);
    setSaving(true);
    const toastId = toast.loading(`Upgrading to ${PLAN_LABELS[selected]}…`);
    try {
      const newExpiry = await upgradePlanClientSide(business.id, selected, cycle);
      setSuccess(newExpiry);
      toast.success(`Upgraded to ${PLAN_LABELS[selected]} 🎉`, toastId);
    } catch (err: any) {
      const msg = err.message || "Upgrade failed";
      setError(msg);
      toast.error(msg, toastId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Upgrade Subscription</h1>
      <p className="text-black/50 mt-1">
        Pay from your wallet balance — {formatNaira(balance)} available
      </p>

      {success && (
        <div className="card p-5 mt-5 bg-bamyon-green/10 border border-bamyon-green">
          <p className="font-display font-bold text-bamyon-green">Plan upgraded 🎉</p>
          <p className="text-sm mt-1">
            Your {PLAN_LABELS[selected]} features are unlocked now. Your plan is active until{" "}
            <span className="font-semibold">{formatDate(success)}</span>.
          </p>
        </div>
      )}

      <div className="card p-5 mt-5">
        <p className="text-xs uppercase text-black/40 font-medium">Current Plan</p>
        <p className="font-display font-bold text-lg">{PLAN_LABELS[activePlan]}</p>
      </div>

      <div className="space-y-3 mt-4">
        {SELF_SERVE_PLANS.map((plan) => (
          <button
            key={plan}
            onClick={() => setSelected(plan)}
            className={`card p-5 w-full text-left ${
              selected === plan ? "border-2 border-bamyon-green" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold">{PLAN_LABELS[plan]}</h3>
              </div>
              <p className="font-bold">
                {formatNaira(PLAN_PRICES[plan].monthly)}
                <span className="text-xs font-normal text-black/40">/mo</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {PLAN_FEATURES[plan].map((f) => (
                <span key={f} className="text-xs bg-black/5 rounded-full px-2 py-1">{f}</span>
              ))}
            </div>
          </button>
        ))}

        <div className="card p-5 border border-dashed border-black/15">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold">{PLAN_LABELS.enterprise}</h3>
              <p className="text-xs text-black/40 mt-0.5">Multiple branches, custom needs</p>
            </div>
            <a href="/dashboard/support" className="btn-secondary text-sm px-4 py-2">Contact Sales</a>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {PLAN_FEATURES.enterprise.map((f) => (
              <span key={f} className="text-xs bg-black/5 rounded-full px-2 py-1">{f}</span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm font-medium mt-5 mb-2">Billing Cycle</p>
      <div className="grid grid-cols-3 gap-2">
        {CYCLES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCycle(c.id)}
            className={`rounded-xl border py-2.5 text-sm font-medium ${
              cycle === c.id ? "border-bamyon-amber bg-bamyon-amber/10 text-bamyon-amberDark" : "border-black/10"
            }`}
          >
            {c.label}
            {c.note && <div className="text-[10px] text-bamyon-green">{c.note}</div>}
          </button>
        ))}
      </div>

      <div className="card p-5 mt-5 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-black/60">Plan</span>
          <span className="font-medium">{PLAN_LABELS[selected]} ({cycle})</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-black/60">Cost</span>
          <span className="font-bold">{formatNaira(cost)}</span>
        </div>
      </div>

      {!canAfford && (
        <p className="text-amber-700 text-sm mt-3">
          Your wallet balance is too low.{" "}
          <a href="/dashboard/wallet" className="underline font-medium">Fund your wallet</a> to continue.
        </p>
      )}
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

      <button onClick={handleUpgrade} disabled={!canAfford || saving} className="btn-primary w-full mt-4">
        {saving ? "Upgrading…" : `Upgrade Now — ${formatNaira(cost)}`}
      </button>
    </div>
  );
}
