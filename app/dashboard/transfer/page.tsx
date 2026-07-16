"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira, formatDate } from "@/lib/format";
import { TransferDoc } from "@/lib/types";
import { requestTransferClientSide } from "@/lib/transferActions";

export default function TransferPage() {
  const { business } = useAuth();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [transfers, setTransfers] = useState<TransferDoc[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const balance = business?.walletBalance || 0;
  const amountNum = Number(amount) || 0;
  const canAfford = amountNum > 0 && amountNum <= balance;

  useEffect(() => {
    if (!business?.id) return;
    const q = query(
      collection(db, "transfers"),
      where("fromBusinessId", "==", business.id),
      orderBy("requestedAt", "desc")
    );
    const unsub = listenWithErrorToast(
      q,
      (snap) => setTransfers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as TransferDoc))),
      toast.error,
      "Transfer history"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function handleSubmit() {
    if (!business?.id || !canAfford || !email.trim()) return;
    setError("");
    setSaving(true);
    const toastId = toast.loading(`Sending ${formatNaira(amountNum)} to ${email}…`);
    try {
      await requestTransferClientSide({
        fromBusinessId: business.id,
        fromBusinessName: business.name,
        toEmail: email,
        amount: amountNum,
      });
      toast.success("Transfer submitted — pending confirmation", toastId);
      setAmount(""); setEmail("");
    } catch (err: any) {
      const msg = err.message || "Transfer failed";
      setError(msg);
      toast.error(msg, toastId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Transfer Money</h1>
      <p className="text-black/50 mt-1">Send wallet balance to another Bamyon business by their account email.</p>

      <div className="card p-6 mt-5 bg-bamyon-green text-white">
        <p className="text-white/70 text-sm">Your Wallet Balance</p>
        <p className="text-3xl font-extrabold mt-1">{formatNaira(balance)}</p>
      </div>

      <div className="card p-5 mt-4 space-y-3">
        <input
          type="number"
          min={1}
          className="input"
          placeholder="Amount (₦)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          type="email"
          className="input"
          placeholder="Recipient's Bamyon account email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {amountNum > 0 && !canAfford && <p className="text-amber-700 text-sm">That's more than your wallet balance.</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button onClick={handleSubmit} disabled={saving || !canAfford || !email.trim()} className="btn-primary w-full">
          {saving ? "Sending…" : `Send ${formatNaira(amountNum || 0)}`}
        </button>
        <p className="text-xs text-black/40">
          Your balance is held immediately. We confirm the recipient's account exists before crediting them —
          if it doesn't, you're refunded automatically.
        </p>
      </div>

      <div className="card mt-4 divide-y divide-black/5">
        <h2 className="font-display font-bold px-5 pt-4 pb-2">Your transfers</h2>
        {transfers.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No transfers yet.</p>
        ) : (
          transfers.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium">{formatNaira(t.amount)} → {t.toEmail}</p>
                <p className="text-xs text-black/40">{formatDate(t.requestedAt)}</p>
                {t.failReason && <p className="text-xs text-red-600">{t.failReason}</p>}
              </div>
              <span className={`text-xs font-semibold rounded-full px-3 py-1 capitalize ${
                t.status === "completed" ? "bg-bamyon-green/10 text-bamyon-green" :
                t.status === "failed" ? "bg-red-500/10 text-red-600" :
                "bg-bamyon-amber/15 text-bamyon-amberDark"
              }`}>
                {t.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
