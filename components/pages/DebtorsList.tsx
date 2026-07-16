"use client";

import { useEffect, useState } from "react";
import { collection, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira } from "@/lib/format";

interface Debtor {
  id: string;
  customerName: string;
  customerPhone: string;
  balance: number;
  approved?: boolean;
  loggedBy?: string;
}

export default function DebtorsList() {
  const { business } = useAuth();
  const toast = useToast();
  const [debtors, setDebtors] = useState<Debtor[]>([]);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "debtors"),
      (snap) => setDebtors(
        snap.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as Debtor))
          .filter((d: Debtor) => d.balance > 0)
      ),
      toast.error,
      "Debtors"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function approve(d: Debtor) {
    if (!business?.id) return;
    const toastId = toast.loading(`Confirming debt for ${d.customerName}…`);
    try {
      await updateDoc(doc(db, "businesses", business.id, "debtors", d.id), { approved: true });
      toast.success("Debt confirmed", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm", toastId);
    }
  }

  async function markPaid(d: Debtor) {
    if (!business?.id) return;
    const toastId = toast.loading(`Marking ${d.customerName} as paid…`);
    try {
      await updateDoc(doc(db, "businesses", business.id, "debtors", d.id), { balance: 0 });
      toast.success(`${d.customerName} marked as paid`, toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update", toastId);
    }
  }

  async function reject(d: Debtor) {
    if (!business?.id) return;
    const toastId = toast.loading("Rejecting entry…");
    try {
      await updateDoc(doc(db, "businesses", business.id, "debtors", d.id), { balance: 0, approved: false });
      toast.success("Entry rejected", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update", toastId);
    }
  }

  function reminderLink(d: Debtor) {
    const msg = encodeURIComponent(
      `Hi ${d.customerName}, this is a friendly reminder from ${business?.name} that you have an outstanding balance of ${formatNaira(d.balance)}. Kindly settle when you can. Thank you!`
    );
    return `https://wa.me/${d.customerPhone.replace(/\D/g, "")}?text=${msg}`;
  }

  const pending = debtors.filter((d) => !d.approved);
  const confirmed = debtors.filter((d) => d.approved);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Debtors</h1>
      <p className="text-black/50 mt-1">Customers who still owe you.</p>

      {pending.length > 0 && (
        <>
          <h2 className="font-display font-bold mt-6 mb-2 text-bamyon-amberDark">
            Pending Approval ({pending.length})
          </h2>
          <div className="card divide-y divide-black/5 border-2 border-bamyon-amber/40">
            {pending.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium">{d.customerName}</p>
                  <p className="text-sm text-black/50">{d.customerPhone}</p>
                  {d.loggedBy && <p className="text-xs text-black/30">Logged by {d.loggedBy}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-bamyon-amberDark">{formatNaira(d.balance)}</p>
                  <div className="flex gap-3 mt-1 text-xs">
                    <button onClick={() => approve(d)} className="text-bamyon-green font-medium">Approve</button>
                    <button onClick={() => reject(d)} className="text-red-600 font-medium">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="font-display font-bold mt-6 mb-2">Confirmed Debtors</h2>
      <div className="card divide-y divide-black/5">
        {confirmed.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No confirmed debtors right now 🎉</p>
        ) : (
          confirmed.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium">{d.customerName}</p>
                <p className="text-sm text-black/50">{d.customerPhone}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-red-600">{formatNaira(d.balance)}</p>
                <div className="flex gap-3 mt-1 text-xs">
                  <a href={reminderLink(d)} target="_blank" className="text-bamyon-green font-medium">Remind via WhatsApp</a>
                  <button onClick={() => markPaid(d)} className="text-black/40 font-medium">Mark paid</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
