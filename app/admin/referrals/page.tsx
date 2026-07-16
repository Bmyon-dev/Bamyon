"use client";

import { useEffect, useState } from "react";
import { collection, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { REFERRAL_BONUS, ReferralRecordDoc } from "@/lib/types";
import { formatDate, formatNaira } from "@/lib/format";

export default function AdminReferralsPage() {
  const toast = useToast();
  const [referrals, setReferrals] = useState<ReferralRecordDoc[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenWithErrorToast(
      collection(db, "referrals"),
      (snap) => setReferrals(
        snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ReferralRecordDoc))
          .sort((a: ReferralRecordDoc, b: ReferralRecordDoc) => b.createdAt - a.createdAt)
      ),
      toast.error,
      "Referrals"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function payBonus(r: ReferralRecordDoc) {
    setBusyId(r.id);
    const toastId = toast.loading(`Crediting ${formatNaira(REFERRAL_BONUS)} bonus…`);
    try {
      await runTransaction(db, async (tx) => {
        const referralRef = doc(db, "referrals", r.id);
        const referrerRef = doc(db, "businesses", r.referrerBusinessId);
        const referrerSnap = await tx.get(referrerRef);
        const referrer = referrerSnap.data();
        if (!referrer) throw new Error("Referrer business not found");
        tx.update(referrerRef, { walletBalance: (referrer.walletBalance || 0) + REFERRAL_BONUS });
        tx.update(referralRef, { bonusPaid: true });
      });
      toast.success("Bonus credited", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to credit bonus", toastId);
    } finally {
      setBusyId(null);
    }
  }

  const unpaid = referrals.filter((r) => !r.bonusPaid);
  const paid = referrals.filter((r) => r.bonusPaid);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Referrals</h1>
      <p className="text-black/50 mt-1">Credit {formatNaira(REFERRAL_BONUS)} to a business once their referral has signed up.</p>

      <h2 className="font-display font-bold mt-6 mb-2">Awaiting bonus ({unpaid.length})</h2>
      <div className="card divide-y divide-black/5">
        {unpaid.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">Nothing waiting 🎉</p>
        ) : (
          unpaid.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium">{r.referredBusinessName}</p>
                <p className="text-xs text-black/40">{formatDate(r.createdAt)}</p>
              </div>
              <button onClick={() => payBonus(r)} disabled={busyId === r.id} className="btn-primary text-sm px-4 py-2">
                {busyId === r.id ? "…" : `Credit ${formatNaira(REFERRAL_BONUS)}`}
              </button>
            </div>
          ))
        )}
      </div>

      <h2 className="font-display font-bold mt-6 mb-2">Paid</h2>
      <div className="card divide-y divide-black/5">
        {paid.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">None yet.</p>
        ) : (
          paid.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span>{r.referredBusinessName}</span>
              <span className="text-bamyon-green font-medium">+{formatNaira(REFERRAL_BONUS)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
