"use client";

import { useEffect, useState } from "react";
import { collection, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { DepositDoc } from "@/lib/types";
import { formatDate, formatNaira } from "@/lib/format";
import { resolveDepositClientSide } from "@/lib/walletAdminActions";

export default function AdminPaymentsPage() {
  const toast = useToast();
  const [pending, setPending] = useState<DepositDoc[]>([]);
  const [resolved, setResolved] = useState<DepositDoc[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const qPending = query(
      collection(db, "deposits"),
      where("status", "==", "pending"),
      orderBy("requestedAt", "asc")
    );
    const unsub = listenWithErrorToast(
      qPending,
      (snap) => setPending(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as DepositDoc))),
      toast.error,
      "Pending payments"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const qResolved = query(collection(db, "deposits"), orderBy("requestedAt", "desc"));
    const unsub = listenWithErrorToast(
      qResolved,
      (snap) => setResolved(
        snap.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as DepositDoc))
          .filter((d: DepositDoc) => d.status !== "pending")
          .slice(0, 20)
      ),
      toast.error,
      "Payment history"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolve(deposit: DepositDoc, action: "approve" | "reject") {
    setBusyId(deposit.id);
    const toastId = toast.loading(
      action === "approve"
        ? `Crediting ${formatNaira(deposit.amount)} to ${deposit.businessName}…`
        : `Rejecting transfer from ${deposit.businessName}…`
    );
    try {
      await resolveDepositClientSide(deposit.id, action);
      toast.success(
        action === "approve" ? `${formatNaira(deposit.amount)} credited to ${deposit.businessName}` : "Transfer rejected",
        toastId
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve deposit", toastId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Payments</h1>
      <p className="text-black/50 mt-1">Confirm bank transfers reported by business owners.</p>

      <h2 className="font-display font-bold mt-6 mb-2">Pending ({pending.length})</h2>
      <div className="card divide-y divide-black/5">
        {pending.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">Nothing waiting on you 🎉</p>
        ) : (
          pending.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium">{d.businessName}</p>
                <p className="text-sm text-black/50">{formatNaira(d.amount)} · {formatDate(d.requestedAt)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => resolve(d, "approve")}
                  disabled={busyId === d.id}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Approve
                </button>
                <button
                  onClick={() => resolve(d, "reject")}
                  disabled={busyId === d.id}
                  className="text-red-600 text-sm font-medium px-3"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <h2 className="font-display font-bold mt-6 mb-2">Recent history</h2>
      <div className="card divide-y divide-black/5">
        {resolved.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <span>{d.businessName} — {formatNaira(d.amount)}</span>
            <span className={`capitalize font-medium ${d.status === "approved" ? "text-bamyon-green" : "text-red-600"}`}>
              {d.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
