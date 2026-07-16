"use client";

import { useEffect, useState } from "react";
import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira, formatDate } from "@/lib/format";
import { REFERRAL_BONUS, ReferralRecordDoc } from "@/lib/types";

export default function ReferralPage() {
  const { business } = useAuth();
  const toast = useToast();
  const [referrals, setReferrals] = useState<ReferralRecordDoc[]>([]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(collection(db, "referrals"), where("referrerBusinessId", "==", business.id));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setReferrals(
        snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ReferralRecordDoc))
          .sort((a: ReferralRecordDoc, b: ReferralRecordDoc) => b.createdAt - a.createdAt)
      ),
      toast.error,
      "Referrals"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  const referralLink = business && origin ? `${origin}/signup?ref=${business.id}` : "";
  const bonusEarned = referrals.filter((r) => r.bonusPaid).length * REFERRAL_BONUS;

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Referrals</h1>
      <p className="text-black/50 mt-1">
        Share your link — when a business you refer joins, you earn {formatNaira(REFERRAL_BONUS)}.
      </p>

      <div className="card p-6 mt-5 bg-bamyon-green text-white">
        <p className="text-white/70 text-sm">Total earned from referrals</p>
        <p className="text-3xl font-extrabold mt-1">{formatNaira(bonusEarned)}</p>
      </div>

      <div className="card p-5 mt-4">
        <p className="text-sm font-medium mb-2">Your referral link</p>
        <div className="flex items-center gap-2">
          <input className="input text-sm" readOnly value={referralLink} />
          <button onClick={copyLink} className="btn-secondary text-sm px-4 shrink-0">
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>

      <div className="card mt-4 divide-y divide-black/5">
        <h2 className="font-display font-bold px-5 pt-4 pb-2">Businesses you've referred</h2>
        {referrals.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No referrals yet — share your link above.</p>
        ) : (
          referrals.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium">{r.referredBusinessName}</p>
                <p className="text-xs text-black/40">{formatDate(r.createdAt)}</p>
              </div>
              <span className={`text-xs font-semibold rounded-full px-3 py-1 ${r.bonusPaid ? "bg-bamyon-green/10 text-bamyon-green" : "bg-bamyon-amber/15 text-bamyon-amberDark"}`}>
                {r.bonusPaid ? `+${formatNaira(REFERRAL_BONUS)} paid` : "Pending"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
