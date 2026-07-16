"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira, formatDate } from "@/lib/format";
import { DepositDoc } from "@/lib/types";

const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || "Wema Bank";
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "0297693145";
const BANK_ACCOUNT_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "Ayobami Israel Agboola";

export default function WalletPage() {
  const { business } = useAuth();
  const toast = useToast();
  const [deposits, setDeposits] = useState<DepositDoc[]>([]);
  const [amount, setAmount] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(
      collection(db, "deposits"),
      where("businessId", "==", business.id),
      orderBy("requestedAt", "desc")
    );
    const unsub = listenWithErrorToast(
      q,
      (snap) => setDeposits(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as DepositDoc))),
      toast.error,
      "Transfer history"
    );
    return unsub;
  }, [business?.id]);

  async function handleReportTransfer() {
    if (!business?.id || !amount || Number(amount) <= 0) return;
    setSaving(true);
    const toastId = toast.loading("Submitting your transfer for confirmation…");
    try {
      await addDoc(collection(db, "deposits"), {
        businessId: business.id,
        businessName: business.name,
        amount: Number(amount),
        status: "pending",
        requestedAt: Date.now(),
      });
      toast.success("Transfer submitted — we'll confirm it shortly", toastId);
      setShowForm(false);
      setAmount("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit", toastId);
    } finally {
      setSaving(false);
    }
  }

  function copyAccount() {
    navigator.clipboard.writeText(BANK_ACCOUNT);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Wallet</h1>
      <p className="text-black/50 mt-1">Fund your wallet, then use the balance to upgrade your plan.</p>

      <div className="card p-6 mt-5 bg-bamyon-green text-white">
        <p className="text-white/70 text-sm">Wallet Balance</p>
        <p className="text-3xl font-extrabold mt-1">
          {formatNaira(business?.walletBalance || 0)}
        </p>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="font-display font-bold mb-3">Fund your wallet</h2>
        <p className="text-sm text-black/60 mb-3">
          Transfer any amount to Bamyon's account below, then tell us you've paid.
          We'll confirm it and credit your wallet — usually within a few minutes.
        </p>
        <div className="bg-black/5 rounded-xl p-4 space-y-1">
          <p className="text-xs text-black/50">Bank</p>
          <p className="font-medium">{BANK_NAME}</p>
          <p className="text-xs text-black/50 mt-2">Account Number</p>
          <div className="flex items-center gap-2">
            <p className="font-mono font-bold text-lg">{BANK_ACCOUNT}</p>
            <button onClick={copyAccount} className="text-bamyon-green text-xs font-medium">
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-black/50 mt-2">Account Name</p>
          <p className="font-medium">{BANK_ACCOUNT_NAME}</p>
        </div>

        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="btn-primary w-full mt-4">
            I have transferred
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <input
              type="number"
              min={1}
              className="input"
              placeholder="How much did you send? (₦)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button onClick={handleReportTransfer} disabled={saving} className="btn-primary w-full">
              {saving ? "Submitting…" : "Submit for confirmation"}
            </button>
          </div>
        )}
      </div>

      <div className="card mt-4 divide-y divide-black/5">
        <h2 className="font-display font-bold px-5 pt-4 pb-2">Transfer history</h2>
        {deposits.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No transfers reported yet.</p>
        ) : (
          deposits.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium">{formatNaira(d.amount)}</p>
                <p className="text-xs text-black/40">{formatDate(d.requestedAt)}</p>
              </div>
              <span
                className={`text-xs font-semibold rounded-full px-3 py-1 capitalize ${
                  d.status === "approved"
                    ? "bg-bamyon-green/10 text-bamyon-green"
                    : d.status === "rejected"
                    ? "bg-red-500/10 text-red-600"
                    : "bg-bamyon-amber/15 text-bamyon-amberDark"
                }`}
              >
                {d.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
