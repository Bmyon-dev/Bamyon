"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira, formatDate } from "@/lib/format";
import { WithdrawalDoc } from "@/lib/types";
import { requestWithdrawalClientSide } from "@/lib/withdrawalActions";

export default function WithdrawPage() {
  const { business } = useAuth();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawals, setWithdrawals] = useState<WithdrawalDoc[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const balance = business?.walletBalance || 0;
  const amountNum = Number(amount) || 0;
  const canAfford = amountNum > 0 && amountNum <= balance;
  const formComplete = canAfford && bankName.trim() && accountNumber.trim() && accountName.trim();

  useEffect(() => {
    if (!business?.id) return;
    const q = query(
      collection(db, "withdrawals"),
      where("businessId", "==", business.id),
      orderBy("requestedAt", "desc")
    );
    const unsub = listenWithErrorToast(
      q,
      (snap) => setWithdrawals(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as WithdrawalDoc))),
      toast.error,
      "Withdrawal history"
    );
    return unsub;
  }, [business?.id]);

  async function handleSubmit() {
    if (!business?.id || !formComplete) return;
    setError("");
    setSaving(true);
    const toastId = toast.loading(`Requesting withdrawal of ${formatNaira(amountNum)}…`);
    try {
      await requestWithdrawalClientSide({
        businessId: business.id,
        businessName: business.name,
        amount: amountNum,
        bankName,
        accountNumber,
        accountName,
      });
      toast.success("Withdrawal requested — pending admin approval", toastId);
      setAmount(""); setBankName(""); setAccountNumber(""); setAccountName("");
    } catch (err: any) {
      const msg = err.message || "Withdrawal request failed";
      setError(msg);
      toast.error(msg, toastId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Withdraw</h1>
      <p className="text-black/50 mt-1">Cash out your wallet balance to your bank account.</p>

      <div className="card p-6 mt-5 bg-bamyon-green text-white">
        <p className="text-white/70 text-sm">Available to withdraw</p>
        <p className="text-3xl font-extrabold mt-1">{formatNaira(balance)}</p>
      </div>

      <div className="card p-5 mt-4 space-y-3">
        <h2 className="font-display font-bold">Request a withdrawal</h2>
        <input
          type="number"
          min={1}
          className="input"
          placeholder="Amount (₦)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input className="input" placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        <input className="input" placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        <input className="input" placeholder="Account name" value={accountName} onChange={(e) => setAccountName(e.target.value)} />

        {amountNum > 0 && !canAfford && (
          <p className="text-amber-700 text-sm">That's more than your wallet balance.</p>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving || !formComplete}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {saving ? "Requesting…" : `Request Withdrawal — ${formatNaira(amountNum || 0)}`}
        </button>
        <p className="text-xs text-black/40">
          Your balance is held as soon as you request — it's sent to your bank once an admin approves it.
        </p>
      </div>

      <div className="card mt-4 divide-y divide-black/5">
        <h2 className="font-display font-bold px-5 pt-4 pb-2">Your withdrawal history</h2>
        {withdrawals.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No withdrawals yet.</p>
        ) : (
          withdrawals.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium">{formatNaira(w.amount)}</p>
                <p className="text-xs text-black/40">{w.bankName} · {w.accountNumber} · {formatDate(w.requestedAt)}</p>
              </div>
              <span className={`text-xs font-semibold rounded-full px-3 py-1 capitalize ${
                w.status === "approved" ? "bg-bamyon-green/10 text-bamyon-green" :
                w.status === "rejected" ? "bg-red-500/10 text-red-600" :
                "bg-bamyon-amber/15 text-bamyon-amberDark"
              }`}>
                {w.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
