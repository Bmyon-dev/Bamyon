"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { BusinessDoc, PLAN_LABELS, PlanId } from "@/lib/types";
import { formatDate, formatNaira } from "@/lib/format";

const PLAN_OPTIONS: PlanId[] = ["free", "standard", "premium", "premium_pro", "enterprise"];

export default function AdminBusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const toast = useToast();
  const [business, setBusiness] = useState<BusinessDoc | null>(null);
  const [form, setForm] = useState<Partial<BusinessDoc>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = listenWithErrorToast(
      doc(db, "businesses", businessId),
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as BusinessDoc;
          setBusiness(data);
          setForm(data);
        }
      },
      toast.error,
      "Business"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function extendDays(days: number) {
    const base = form.planExpiry && form.planExpiry > Date.now() ? form.planExpiry : Date.now();
    setForm({ ...form, planExpiry: base + days * 24 * 60 * 60 * 1000 });
  }

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    const toastId = toast.loading("Saving business…");
    try {
      await updateDoc(doc(db, "businesses", business.id), {
        name: form.name,
        ownerName: form.ownerName,
        phone: form.phone,
        plan: form.plan,
        planExpiry: form.planExpiry ?? null,
        walletBalance: Number(form.walletBalance) || 0,
      });
      toast.success("Business updated", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to save", toastId);
    } finally {
      setSaving(false);
    }
  }

  if (!business) {
    return <div className="text-black/40 text-sm">Loading…</div>;
  }

  return (
    <div>
      <button onClick={() => router.push("/admin")} className="text-bamyon-green text-sm font-medium mb-4">← Back to Businesses</button>
      <h1 className="font-display text-2xl font-bold">{business.name}</h1>
      <p className="text-black/50 mt-1">Joined {formatDate(business.createdAt)} · {business.email}</p>

      <div className="card p-5 mt-5 space-y-4">
        <div>
          <label className="text-sm font-medium">Business Name</label>
          <input className="input mt-1" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Owner Name</label>
          <input className="input mt-1" value={form.ownerName || ""} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Phone</label>
          <input className="input mt-1" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Wallet Balance (₦)</label>
          <input type="number" className="input mt-1" value={form.walletBalance ?? 0} onChange={(e) => setForm({ ...form, walletBalance: Number(e.target.value) })} />
        </div>
      </div>

      <div className="card p-5 mt-4 space-y-4">
        <h2 className="font-display font-bold">Plan</h2>
        <div>
          <label className="text-sm font-medium">Plan tier</label>
          <select className="input mt-1" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as PlanId })}>
            {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Plan expiry</label>
          <p className="text-sm mt-1">{formatDate(form.planExpiry)}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => extendDays(30)} className="btn-secondary text-xs px-3 py-1.5">+30 days</button>
            <button onClick={() => extendDays(182)} className="btn-secondary text-xs px-3 py-1.5">+6 months</button>
            <button onClick={() => extendDays(365)} className="btn-secondary text-xs px-3 py-1.5">+1 year</button>
            <button onClick={() => setForm({ ...form, planExpiry: null })} className="text-red-600 text-xs px-3 py-1.5">Clear</button>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full mt-5">
        {saving ? "Saving…" : "Save All Changes"}
      </button>
    </div>
  );
}
