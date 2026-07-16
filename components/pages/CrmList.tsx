"use client";

import { useEffect, useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatDate, formatNaira } from "@/lib/format";
import { planUnlocks } from "@/lib/permissions";
import { amplifyText } from "@/lib/pollinationsText";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalSpent: number;
  lastSaleAt: number;
}

export default function CrmList() {
  const { business, firebaseUser } = useAuth();
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [amplifying, setAmplifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const isPremiumPro = planUnlocks(business, "premium_pro");
  const withEmail = customers.filter((c) => c.email);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "customers"),
      (snap) => setCustomers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Customer))),
      toast.error,
      "Customers"
    );
    return unsub;
  }, [business?.id]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllWithEmail() {
    setSelected(new Set(withEmail.map((c) => c.id)));
  }

  async function handleAmplify() {
    setAmplifying(true);
    setError("");
    const toastId = toast.loading("Improving your message with AI…");
    try {
      const improved = await amplifyText(message, `A small business owner emailing past customers with an update or offer`);
      setMessage(improved);
      toast.success("Message improved", toastId);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "AI rewrite failed", toastId);
    } finally {
      setAmplifying(false);
    }
  }

  async function handleSend() {
    if (!firebaseUser || selected.size === 0 || !message.trim()) return;
    setSending(true);
    setError("");
    setResult("");
    const toastId = toast.loading(`Sending campaign to ${selected.size} customer${selected.size === 1 ? "" : "s"}…`);
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch("/api/crm/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          message,
          recipients: customers.filter((c) => selected.has(c.id)).map((c) => ({ email: c.email, name: c.name })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(`Sent to ${data.sent} customer${data.sent === 1 ? "" : "s"}.`);
      toast.success(`Campaign sent to ${data.sent} customer${data.sent === 1 ? "" : "s"}`, toastId);
      setMessage("");
      setSelected(new Set());
    } catch (err: any) {
      const msg = err.message || "Failed to send campaign";
      setError(msg);
      toast.error(msg, toastId);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Customers / CRM</h1>
      <p className="text-black/50 mt-1">Everyone who has bought from you.</p>

      <div className="card mt-5 divide-y divide-black/5">
        {customers.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No customers recorded yet.</p>
        ) : (
          customers.map((c) => (
            <label key={c.id} className="flex items-center justify-between px-5 py-3 cursor-pointer">
              <div className="flex items-center gap-3">
                {isPremiumPro && c.email && (
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                )}
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-black/50">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatNaira(c.totalSpent || 0)}</p>
                <p className="text-xs text-black/40">Last sale {formatDate(c.lastSaleAt)}</p>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="card p-5 mt-5">
        <h2 className="font-display font-bold mb-1">Email campaign</h2>
        {!isPremiumPro ? (
          <p className="text-sm text-black/50 mt-1">
            🔒 One-click email campaigns to past customers are a{" "}
            <span className="font-medium">Premium Pro</span> feature (₦15,000/mo).{" "}
            <a href="/dashboard/upgrade" className="text-bamyon-green font-medium">Upgrade</a>
          </p>
        ) : (
          <div className="space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-black/50">
                {selected.size} of {withEmail.length} customers with an email selected
              </p>
              <button onClick={selectAllWithEmail} className="text-bamyon-green text-sm font-medium">
                Select all with email
              </button>
            </div>
            <textarea
              className="input min-h-[100px]"
              placeholder="e.g. We just restocked your favorite items — come check us out this week!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleAmplify} disabled={amplifying || !message.trim()} className="btn-secondary text-sm px-4 py-2">
                {amplifying ? "Improving…" : "✨ Improve with AI"}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || selected.size === 0 || !message.trim()}
                className="btn-primary text-sm px-4 py-2"
              >
                {sending ? "Sending…" : `Send to ${selected.size}`}
              </button>
            </div>
            {result && <p className="text-bamyon-green text-sm">{result}</p>}
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
