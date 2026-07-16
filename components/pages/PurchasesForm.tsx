"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { formatNaira } from "@/lib/format";
import { increaseInventory } from "@/lib/inventory";
import { planUnlocks } from "@/lib/permissions";
import ReceiptScanner from "@/components/ReceiptScanner";
import { ExtractedItem } from "@/lib/pollinationsVision";

interface Item { name: string; qty: number; cost: number }

export default function PurchasesForm({ homeHref = "/dashboard" }: { homeHref?: string }) {
  const { business } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([{ name: "", qty: 1, cost: 0 }]);
  const [supplier, setSupplier] = useState("");
  const [saving, setSaving] = useState(false);

  const isPremium = planUnlocks(business, "premium");
  const total = items.reduce((s, i) => s + i.qty * i.cost, 0);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function handleScanned(scanned: ExtractedItem[], counterpartyName?: string) {
    setItems(scanned.map((it) => ({ name: it.name, qty: it.qty, cost: it.price })));
    if (counterpartyName && !supplier) setSupplier(counterpartyName);
  }

  async function handleSubmit() {
    const validItems = items.filter((i) => i.name && i.qty > 0);
    if (!business?.id || total <= 0 || validItems.length === 0) return;
    setSaving(true);
    const toastId = toast.loading("Logging purchase…");
    try {
      await Promise.all(
        validItems.map((i) =>
          addDoc(collection(db, "businesses", business.id, "purchases"), {
            item: i.name, qty: i.qty, cost: i.cost, supplier, total: i.qty * i.cost, createdAt: Date.now(),
          })
        )
      );
      await Promise.all(
        validItems.map((i) => increaseInventory(business.id, i.name, i.qty, i.cost))
      );
      toast.success(`Purchase logged — ${formatNaira(total)}`, toastId);
      router.push(homeHref);
    } catch (err: any) {
      toast.error(err.message || "Failed to log purchase", toastId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Log a Purchase</h1>
      <p className="text-black/50 mt-1">Record stock coming in — inventory updates automatically</p>

      {isPremium ? (
        <ReceiptScanner kind="purchase" onExtracted={handleScanned} />
      ) : (
        <div className="card p-4 mt-4 flex items-center justify-between">
          <p className="text-sm text-black/50">🔒 Scan an invoice with AI is a Premium feature.</p>
          <a href="/dashboard/upgrade" className="text-bamyon-green text-sm font-medium shrink-0 ml-3">Upgrade</a>
        </div>
      )}

      <div className="card p-5 mt-4 space-y-3">
        <h2 className="font-medium">Items Purchased</h2>
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="Item name" value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })} />
            <input type="number" min={1} className="input" placeholder="Qty" value={item.qty} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })} />
            <input type="number" min={0} className="input" placeholder="Cost/unit" value={item.cost || ""} onChange={(e) => updateItem(idx, { cost: Number(e.target.value) })} />
          </div>
        ))}
        <button onClick={() => setItems((p) => [...p, { name: "", qty: 1, cost: 0 }])} className="text-bamyon-green text-sm font-medium">
          + Add another item
        </button>
        <input className="input" placeholder="Supplier (optional)" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        <div className="flex items-center justify-between border-t border-black/5 pt-3">
          <span className="text-black/60">Total</span>
          <span className="font-bold text-lg">{formatNaira(total)}</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || total <= 0}
        className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
      >
        {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
        {saving ? "Saving…" : `Log Purchase — ${formatNaira(total)}`}
      </button>
    </div>
  );
}
