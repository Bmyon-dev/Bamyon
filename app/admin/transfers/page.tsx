"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { TransferDoc } from "@/lib/types";
import { formatDate, formatNaira } from "@/lib/format";
import { resolveTransferClientSide } from "@/lib/walletAdminActions";

export default function AdminTransfersPage() {
  const toast = useToast();
  const [pending, setPending] = useState<TransferDoc[]>([]);
  const [resolved, setResolved] = useState<TransferDoc[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "transfers"), where("status", "==", "pending"), orderBy("requestedAt", "asc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setPending(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as TransferDoc))),
      toast.error,
      "Pending transfers"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = query(collection(db, "transfers"), orderBy("requestedAt", "desc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setResolved(
        snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as TransferDoc)).filter((t: TransferDoc) => t.status !== "pending").slice(0, 20)
      ),
      toast.error,
      "Transfer history"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolve(t: TransferDoc) {
    setBusyId(t.id);
    const toastId = toast.loading(`Resolving transfer to ${t.toEmail}…`);
    try {
      await resolveTransferClientSide(t.id);
      toast.success("Transfer resolved", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve", toastId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Transfers</h1>
      <p className="text-black/50 mt-1">Peer-to-peer wallet transfers between businesses.</p>

      <h2 className="font-display font-bold mt-6 mb-2">Pending ({pending.length})</h2>
      <div className="card divide-y divide-black/5">
        {pending.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">Nothing waiting 🎉</p>
        ) : (
          pending.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium">{t.fromBusinessName} → {t.toEmail}</p>
                <p className="text-sm text-black/50">{formatNaira(t.amount)} · {formatDate(t.requestedAt)}</p>
              </div>
              <button onClick={() => resolve(t)} disabled={busyId === t.id} className="btn-primary text-sm px-4 py-2">
                {busyId === t.id ? "…" : "Resolve"}
              </button>
            </div>
          ))
        )}
      </div>

      <h2 className="font-display font-bold mt-6 mb-2">Recent history</h2>
      <div className="card divide-y divide-black/5">
        {resolved.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">None yet.</p>
        ) : (
          resolved.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span>{t.fromBusinessName} → {t.toEmail} — {formatNaira(t.amount)}</span>
              <span className={`capitalize font-medium ${t.status === "completed" ? "text-bamyon-green" : "text-red-600"}`}>{t.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
