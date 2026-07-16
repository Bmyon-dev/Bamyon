"use client";

import { useEffect, useState } from "react";
import { collection, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { WithdrawalDoc } from "@/lib/types";
import { formatDate, formatNaira } from "@/lib/format";
import { resolveWithdrawalClientSide } from "@/lib/walletAdminActions";

export default function AdminWithdrawalsPage() {
  const toast = useToast();
  const [pending, setPending] = useState<WithdrawalDoc[]>([]);
  const [resolved, setResolved] = useState<WithdrawalDoc[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "withdrawals"), where("status", "==", "pending"), orderBy("requestedAt", "asc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setPending(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as WithdrawalDoc))),
      toast.error,
      "Pending withdrawals"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = query(collection(db, "withdrawals"), orderBy("requestedAt", "desc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setResolved(
        snap.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as WithdrawalDoc))
          .filter((w: WithdrawalDoc) => w.status !== "pending")
          .slice(0, 20)
      ),
      toast.error,
      "Withdrawal history"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolve(w: WithdrawalDoc, action: "approve" | "reject") {
    setBusyId(w.id);
    const toastId = toast.loading(
      action === "approve"
        ? `Marking ${formatNaira(w.amount)} to ${w.businessName} as sent…`
        : `Rejecting and refunding ${w.businessName}…`
    );
    try {
      await resolveWithdrawalClientSide(w.id, action);
      toast.success(
        action === "approve" ? "Marked as paid out" : "Rejected — balance refunded",
        toastId
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve withdrawal", toastId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Withdrawals</h1>
      <p className="text-black/50 mt-1">
        Pay these out manually via bank transfer, then mark them approved here.
      </p>

      <h2 className="font-display font-bold mt-6 mb-2">Pending ({pending.length})</h2>
      <div className="card divide-y divide-black/5">
        {pending.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">Nothing waiting 🎉</p>
        ) : (
          pending.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium">{w.businessName} — {formatNaira(w.amount)}</p>
                <p className="text-sm text-black/60 mt-1">{w.bankName} · {w.accountNumber} · {w.accountName}</p>
                <p className="text-xs text-black/40 mt-1">{formatDate(w.requestedAt)}</p>
              </div>
              <div className="flex gap-2 shrink-0 ml-3">
                <button
                  onClick={() => resolve(w, "approve")}
                  disabled={busyId === w.id}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Mark Paid
                </button>
                <button
                  onClick={() => resolve(w, "reject")}
                  disabled={busyId === w.id}
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
        {resolved.map((w) => (
          <div key={w.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <span>{w.businessName} — {formatNaira(w.amount)}</span>
            <span className={`capitalize font-medium ${w.status === "approved" ? "text-bamyon-green" : "text-red-600"}`}>
              {w.status}
            </span>
          </div>
        ))}
        {resolved.length === 0 && <p className="text-black/40 text-sm p-6 text-center">None yet.</p>}
      </div>
    </div>
  );
}
