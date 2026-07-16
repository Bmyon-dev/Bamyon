"use client";

import { useEffect, useState } from "react";
import { collection, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { AdsRequestDoc } from "@/lib/types";
import { formatDate } from "@/lib/format";

const STATUSES: AdsRequestDoc["status"][] = ["pending", "in_progress", "live"];

export default function AdminAdsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState<AdsRequestDoc[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "adsRequests"), orderBy("requestedAt", "desc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as AdsRequestDoc))),
      toast.error,
      "Ad requests"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, status: AdsRequestDoc["status"]) {
    setBusyId(id);
    const toastId = toast.loading("Updating status…");
    try {
      await updateDoc(doc(db, "adsRequests", id), { status });
      toast.success("Status updated", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update", toastId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Ad Requests</h1>
      <p className="text-black/50 mt-1">₦5,000 flat per Facebook ad campaign setup.</p>

      <div className="space-y-3 mt-5">
        {requests.length === 0 ? (
          <div className="card p-6 text-center text-black/40 text-sm">No ad requests yet.</div>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="card p-5">
              <p className="font-medium">{r.businessName}</p>
              <p className="text-sm text-black/60 mt-1">{r.brief}</p>
              {r.budget && <p className="text-xs text-black/40 mt-1">Budget: {r.budget}</p>}
              <p className="text-xs text-black/30 mt-1">{formatDate(r.requestedAt)}</p>
              <div className="flex gap-2 mt-3">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(r.id, s)}
                    disabled={busyId === r.id}
                    className={`text-xs font-medium rounded-full px-3 py-1.5 capitalize ${r.status === s ? "bg-bamyon-green text-white" : "bg-black/5 text-black/50"}`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
