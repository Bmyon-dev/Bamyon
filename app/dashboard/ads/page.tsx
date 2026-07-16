"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import PlanGate from "@/components/PlanGate";
import { formatNaira, formatDate } from "@/lib/format";
import { ADS_REQUEST_PRICE, AdsRequestDoc } from "@/lib/types";
import { requestAdsClientSide } from "@/lib/adsActions";

function AdsForm() {
  const { business } = useAuth();
  const toast = useToast();
  const [hasFB, setHasFB] = useState<"unanswered" | "yes" | "no">("unanswered");
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState("");
  const [requests, setRequests] = useState<AdsRequestDoc[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const balance = business?.walletBalance || 0;
  const canAfford = balance >= ADS_REQUEST_PRICE;

  useEffect(() => {
    if (!business?.id) return;
    const q = query(collection(db, "adsRequests"), where("businessId", "==", business.id), orderBy("requestedAt", "desc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as AdsRequestDoc))),
      toast.error,
      "Ad requests"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function handleSubmit() {
    if (!business?.id || !brief.trim()) return;
    setError("");
    setSaving(true);
    const toastId = toast.loading("Sending your ad request…");
    try {
      await requestAdsClientSide(business.id, business.name, brief, budget);
      toast.success("Ad request sent", toastId);
      setBrief(""); setBudget("");
    } catch (err: any) {
      const msg = err.message || "Request failed";
      setError(msg);
      toast.error(msg, toastId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Run Ads on Facebook</h1>
      <p className="text-black/50 mt-1">We set up and run your Facebook ad campaign — a flat {formatNaira(ADS_REQUEST_PRICE)}.</p>

      {hasFB === "unanswered" ? (
        <div className="card p-5 mt-5 space-y-3">
          <h2 className="font-display font-bold">Do you already have a Facebook Page for your business?</h2>
          <p className="text-sm text-black/60">You'll need one before we can run ads on your behalf.</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setHasFB("yes")} className="btn-primary text-sm">Yes, I have one</button>
            <button onClick={() => setHasFB("no")} className="btn-secondary text-sm">No, not yet</button>
          </div>
        </div>
      ) : hasFB === "no" ? (
        <div className="card p-5 mt-5 space-y-3">
          <h2 className="font-display font-bold">You'll need a Facebook Page first</h2>
          <p className="text-sm text-black/60">
            Create a free Facebook Page for your business, then come back here to request ads.
          </p>
          <a href="/dashboard/support" className="btn-secondary w-full text-center block">Need help? Message Customer Care</a>
          <button onClick={() => setHasFB("yes")} className="text-black/40 text-xs text-center w-full">
            Actually, I already have one →
          </button>
        </div>
      ) : (
        <div className="card p-5 mt-5 space-y-3">
          <p className="text-sm text-black/60">Wallet balance: <span className="font-semibold">{formatNaira(balance)}</span></p>
          <textarea
            className="input min-h-[90px]"
            placeholder="What are you promoting? Who's your target audience?"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <input className="input" placeholder="Your ad budget (e.g. ₦10,000/week)" value={budget} onChange={(e) => setBudget(e.target.value)} />
          {!canAfford && (
            <p className="text-amber-700 text-sm">
              Your wallet balance is too low.{" "}
              <a href="/dashboard/wallet" className="underline font-medium">Fund your wallet</a> to continue.
            </p>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button onClick={handleSubmit} disabled={saving || !canAfford || !brief.trim()} className="btn-primary w-full">
            {saving ? "Sending…" : `Request Ads — ${formatNaira(ADS_REQUEST_PRICE)}`}
          </button>
        </div>
      )}

      <div className="card mt-4 divide-y divide-black/5">
        <h2 className="font-display font-bold px-5 pt-4 pb-2">Your requests</h2>
        {requests.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No ad requests yet.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm">{r.brief}</p>
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-bamyon-amber/15 text-bamyon-amberDark capitalize shrink-0 ml-3">
                  {r.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-black/40 mt-1">{formatDate(r.requestedAt)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdsPage() {
  return (
    <PlanGate minPlan="premium">
      <AdsForm />
    </PlanGate>
  );
}
