"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira, formatDate } from "@/lib/format";
import { WEBSITE_REQUEST_PRICE, WebsiteRequestDoc } from "@/lib/types";
import { requestWebsiteClientSide } from "@/lib/websiteActions";

export default function WebsiteRequestPage() {
  const { business } = useAuth();
  const toast = useToast();
  const [brief, setBrief] = useState("");
  const [requests, setRequests] = useState<WebsiteRequestDoc[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const balance = business?.walletBalance || 0;
  const canAfford = balance >= WEBSITE_REQUEST_PRICE;

  useEffect(() => {
    if (!business?.id) return;
    const q = query(collection(db, "websiteRequests"), where("businessId", "==", business.id), orderBy("requestedAt", "desc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as WebsiteRequestDoc))),
      toast.error,
      "Website requests"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function handleSubmit() {
    if (!business?.id || !brief.trim()) return;
    setError("");
    setSaving(true);
    const toastId = toast.loading("Sending your website request…");
    try {
      await requestWebsiteClientSide(business.id, business.name, brief);
      toast.success("Website request sent", toastId);
      setBrief("");
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
      <h1 className="font-display text-2xl font-bold">Build a Website</h1>
      <p className="text-black/50 mt-1">
        A full business website, built for you — flat {formatNaira(WEBSITE_REQUEST_PRICE)}.
      </p>

      <div className="card p-5 mt-5 space-y-3">
        <p className="text-sm text-black/60">Wallet balance: <span className="font-semibold">{formatNaira(balance)}</span></p>
        <textarea
          className="input min-h-[100px]"
          placeholder="Tell us about your business, what pages you want (Home, About, Contact, Products…), and any examples you like."
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
        {!canAfford && (
          <p className="text-amber-700 text-sm">
            Your wallet balance is too low.{" "}
            <a href="/dashboard/wallet" className="underline font-medium">Fund your wallet</a> to continue.
          </p>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button onClick={handleSubmit} disabled={saving || !canAfford || !brief.trim()} className="btn-primary w-full">
          {saving ? "Sending…" : `Request Website — ${formatNaira(WEBSITE_REQUEST_PRICE)}`}
        </button>
      </div>

      <div className="card mt-4 divide-y divide-black/5">
        <h2 className="font-display font-bold px-5 pt-4 pb-2">Your requests</h2>
        {requests.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No website requests yet.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm">{r.brief}</p>
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-bamyon-amber/15 text-bamyon-amberDark capitalize shrink-0 ml-3">
                  {r.status.replace("_", " ")}
                </span>
              </div>
              {r.deliveredUrl && (
                <a href={r.deliveredUrl} target="_blank" className="text-bamyon-green text-xs font-medium block mt-1">
                  View your website →
                </a>
              )}
              <p className="text-xs text-black/40 mt-1">{formatDate(r.requestedAt)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
