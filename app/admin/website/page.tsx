"use client";

import { useEffect, useState } from "react";
import { collection, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { WebsiteRequestDoc } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function AdminWebsitePage() {
  const toast = useToast();
  const [requests, setRequests] = useState<WebsiteRequestDoc[]>([]);
  const [urlDraft, setUrlDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "websiteRequests"), orderBy("requestedAt", "desc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as WebsiteRequestDoc))),
      toast.error,
      "Website requests"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markInProgress(id: string) {
    setBusyId(id);
    try {
      await updateDoc(doc(db, "websiteRequests", id), { status: "in_progress" });
      toast.success("Marked in progress");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  async function deliver(id: string) {
    const url = urlDraft[id]?.trim();
    if (!url) return;
    setBusyId(id);
    const toastId = toast.loading("Delivering website…");
    try {
      await updateDoc(doc(db, "websiteRequests", id), { status: "delivered", deliveredUrl: url });
      toast.success("Website delivered", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update", toastId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Website Requests</h1>
      <p className="text-black/50 mt-1">₦10,000 flat per website build.</p>

      <div className="space-y-3 mt-5">
        {requests.length === 0 ? (
          <div className="card p-6 text-center text-black/40 text-sm">No requests yet.</div>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium">{r.businessName}</p>
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-bamyon-amber/15 text-bamyon-amberDark capitalize">
                  {r.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-black/60 mt-1">{r.brief}</p>
              <p className="text-xs text-black/30 mt-1">{formatDate(r.requestedAt)}</p>

              {r.status === "pending" && (
                <button onClick={() => markInProgress(r.id)} disabled={busyId === r.id} className="btn-secondary text-sm px-4 py-1.5 mt-3">
                  Mark In Progress
                </button>
              )}
              {r.status !== "delivered" && (
                <div className="flex gap-2 mt-3">
                  <input
                    className="input text-sm"
                    placeholder="Delivered website URL"
                    value={urlDraft[r.id] || ""}
                    onChange={(e) => setUrlDraft((p) => ({ ...p, [r.id]: e.target.value }))}
                  />
                  <button onClick={() => deliver(r.id)} disabled={busyId === r.id} className="btn-primary text-sm px-4 shrink-0">
                    Deliver
                  </button>
                </div>
              )}
              {r.deliveredUrl && (
                <a href={r.deliveredUrl} target="_blank" className="text-bamyon-green text-xs font-medium block mt-2">{r.deliveredUrl}</a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
