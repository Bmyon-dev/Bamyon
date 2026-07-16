"use client";

import { useEffect, useState } from "react";
import { collection, orderBy, query, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { DesignRequestDoc } from "@/lib/types";
import { formatDate } from "@/lib/format";
import ImageUpload from "@/components/ImageUpload";

export default function AdminDesignPage() {
  const toast = useToast();
  const [requests, setRequests] = useState<DesignRequestDoc[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(collection(db, "designRequests"), orderBy("requestedAt", "desc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as DesignRequestDoc))),
      toast.error,
      "Design requests"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadFlyer(requestId: string, url: string) {
    setBusyId(requestId);
    const toastId = toast.loading("Saving flyer…");
    try {
      await updateDoc(doc(db, "designRequests", requestId), {
        flyerUrl: url, status: "delivered", deliveredAt: Date.now(),
      });
      toast.success("Flyer delivered to the business", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to save", toastId);
    } finally {
      setBusyId(null);
    }
  }

  async function sendReply(requestId: string) {
    const text = replyDraft[requestId]?.trim();
    if (!text) return;
    setBusyId(requestId);
    const toastId = toast.loading("Sending reply…");
    try {
      await updateDoc(doc(db, "designRequests", requestId), {
        feedback: arrayUnion({ from: "admin", text, createdAt: Date.now() }),
      });
      toast.success("Reply sent", toastId);
      setReplyDraft((prev) => ({ ...prev, [requestId]: "" }));
    } catch (err: any) {
      toast.error(err.message || "Failed to send", toastId);
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const delivered = requests.filter((r) => r.status === "delivered");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Design Requests</h1>
      <p className="text-black/50 mt-1">₦2,000 flat, 24-hour delivery.</p>

      <h2 className="font-display font-bold mt-6 mb-2">Pending ({pending.length})</h2>
      <div className="space-y-3">
        {pending.length === 0 ? (
          <div className="card p-6 text-center text-black/40 text-sm">Nothing waiting 🎉</div>
        ) : (
          pending.map((r) => (
            <div key={r.id} className="card p-5">
              <p className="font-medium">{r.businessName}</p>
              <p className="text-sm text-black/60 mt-1">{r.brief}</p>
              <p className="text-xs text-black/40 mt-1">{formatDate(r.requestedAt)}</p>
              <div className="mt-3">
                <ImageUpload label="Upload flyer" onUploaded={(url) => uploadFlyer(r.id, url)} />
              </div>
            </div>
          ))
        )}
      </div>

      <h2 className="font-display font-bold mt-6 mb-2">Delivered</h2>
      <div className="space-y-3">
        {delivered.length === 0 ? (
          <div className="card p-6 text-center text-black/40 text-sm">None yet.</div>
        ) : (
          delivered.slice(0, 20).map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.businessName}</p>
                  <p className="text-sm text-black/60 mt-1">{r.brief}</p>
                </div>
                {r.flyerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.flyerUrl} alt="Delivered flyer" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                )}
              </div>

              {(r.feedback?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-2">
                  {r.feedback!.map((f, i) => (
                    <div key={i} className={`text-xs rounded-lg px-3 py-2 max-w-[85%] ${f.from === "admin" ? "bg-bamyon-green/10 ml-auto" : "bg-black/5"}`}>
                      <p className="font-semibold opacity-60 capitalize">{f.from === "admin" ? "You" : r.businessName}</p>
                      {f.text}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <input
                  className="input text-sm"
                  placeholder="Reply about the requested changes…"
                  value={replyDraft[r.id] || ""}
                  onChange={(e) => setReplyDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                />
                <button onClick={() => sendReply(r.id)} disabled={busyId === r.id} className="btn-secondary text-sm px-4 shrink-0">
                  Send
                </button>
              </div>
              <div className="mt-2">
                <ImageUpload label="Upload revised flyer" onUploaded={(url) => uploadFlyer(r.id, url)} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
