"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira, formatDate } from "@/lib/format";
import { DESIGN_REQUEST_PRICE, DesignRequestDoc } from "@/lib/types";
import { requestDesignerClientSide } from "@/lib/designActions";

export default function DesignRequestForm() {
  const { business } = useAuth();
  const toast = useToast();
  const [brief, setBrief] = useState("");
  const [requests, setRequests] = useState<DesignRequestDoc[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [sendingFeedback, setSendingFeedback] = useState<string | null>(null);

  const balance = business?.walletBalance || 0;
  const canAfford = balance >= DESIGN_REQUEST_PRICE;

  useEffect(() => {
    if (!business?.id) return;
    const q = query(
      collection(db, "designRequests"),
      where("businessId", "==", business.id),
      orderBy("requestedAt", "desc")
    );
    const unsub = listenWithErrorToast(
      q,
      (snap) => setRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as DesignRequestDoc))),
      toast.error,
      "Design request history"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function handleSubmit() {
    if (!business?.id || !brief.trim()) return;
    setError("");
    setSaving(true);
    const toastId = toast.loading("Sending your design request…");
    try {
      await requestDesignerClientSide(business.id, business.name, brief);
      toast.success("Design request sent — 24h delivery", toastId);
      setBrief("");
    } catch (err: any) {
      const msg = err.message || "Request failed";
      setError(msg);
      toast.error(msg, toastId);
    } finally {
      setSaving(false);
    }
  }

  async function sendFeedback(requestId: string) {
    const text = feedbackDraft[requestId]?.trim();
    if (!text) return;
    setSendingFeedback(requestId);
    const toastId = toast.loading("Sending your edit request…");
    try {
      await updateDoc(doc(db, "designRequests", requestId), {
        feedback: arrayUnion({ from: "owner", text, createdAt: Date.now() }),
      });
      toast.success("Edit request sent to the designer", toastId);
      setFeedbackDraft((prev) => ({ ...prev, [requestId]: "" }));
    } catch (err: any) {
      toast.error(err.message || "Failed to send", toastId);
    } finally {
      setSendingFeedback(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Hire a Designer</h1>
      <p className="text-black/50 mt-1">
        A flat {formatNaira(DESIGN_REQUEST_PRICE)} gets you a graphic — flyer, banner, product image, whatever you need — delivered within 24 hours.
      </p>

      <div className="card p-5 mt-5 space-y-3">
        <p className="text-sm text-black/60">Wallet balance: <span className="font-semibold">{formatNaira(balance)}</span></p>
        <textarea
          className="input min-h-[100px]"
          placeholder="Describe what you need — e.g. 'A promo flyer for our end-of-month sale, green and gold, with our logo and WhatsApp number.'"
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
        <button onClick={handleSubmit} disabled={saving || !canAfford || !brief.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {saving ? "Sending…" : `Request Designer — ${formatNaira(DESIGN_REQUEST_PRICE)}`}
        </button>
      </div>

      <div className="space-y-4 mt-4">
        {requests.length === 0 ? (
          <div className="card p-6 text-center text-black/40 text-sm">No design requests yet.</div>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm">{r.brief}</p>
                <span className={`text-xs font-semibold rounded-full px-3 py-1 shrink-0 ml-3 ${
                  r.status === "delivered" ? "bg-bamyon-green/10 text-bamyon-green" : "bg-bamyon-amber/15 text-bamyon-amberDark"
                }`}>
                  {r.status}
                </span>
              </div>
              <p className="text-xs text-black/40 mt-1">{formatDate(r.requestedAt)}</p>

              {r.flyerUrl && (
                <div className="mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.flyerUrl} alt="Your delivered flyer" className="rounded-xl w-full max-w-xs border border-black/10" />
                  <a href={r.flyerUrl} target="_blank" className="text-bamyon-green text-xs font-medium block mt-1">
                    Open full size / download
                  </a>
                </div>
              )}

              {(r.feedback?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-2">
                  {r.feedback!.map((f, i) => (
                    <div key={i} className={`text-xs rounded-lg px-3 py-2 max-w-[85%] ${f.from === "owner" ? "bg-bamyon-green/10 ml-auto" : "bg-black/5"}`}>
                      <p className="font-semibold opacity-60 capitalize">{f.from === "owner" ? "You" : "Designer"}</p>
                      {f.text}
                    </div>
                  ))}
                </div>
              )}

              {r.flyerUrl && (
                <div className="flex gap-2 mt-3">
                  <input
                    className="input text-sm"
                    placeholder="Want changes? Describe them here…"
                    value={feedbackDraft[r.id] || ""}
                    onChange={(e) => setFeedbackDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  />
                  <button
                    onClick={() => sendFeedback(r.id)}
                    disabled={sendingFeedback === r.id || !feedbackDraft[r.id]?.trim()}
                    className="btn-secondary text-sm px-4 shrink-0"
                  >
                    {sendingFeedback === r.id ? "…" : "Send"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
