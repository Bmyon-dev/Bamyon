"use client";

import { useEffect, useState } from "react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira } from "@/lib/format";
import { slugifyItemName } from "@/lib/inventory";

interface StockItem { id: string; name: string; quantity: number; unitCost: number; sellingPrice?: number }

export default function InventoryList() {
  const { business } = useAuth();
  const toast = useToast();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", quantity: "", unitCost: "", sellingPrice: "" });
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "inventory"),
      (snap) => setStock(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as StockItem))),
      toast.error,
      "Inventory"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  function startAdd() {
    setEditing(null);
    setForm({ name: "", quantity: "", unitCost: "", sellingPrice: "" });
    setShowAdd(true);
  }

  function startEdit(item: StockItem) {
    setEditing(item.id);
    setShowAdd(true);
    setForm({
      name: item.name,
      quantity: String(item.quantity ?? 0),
      unitCost: String(item.unitCost ?? 0),
      sellingPrice: String(item.sellingPrice ?? item.unitCost ?? 0),
    });
  }

  async function handleSave() {
    if (!business?.id || !form.name.trim()) return;
    setSaving(true);
    const id = editing || slugifyItemName(form.name);
    const toastId = toast.loading(editing ? `Updating ${form.name}…` : `Adding ${form.name}…`);
    try {
      await setDoc(
        doc(db, "businesses", business.id, "inventory", id),
        {
          name: form.name.trim(),
          quantity: Number(form.quantity) || 0,
          unitCost: Number(form.unitCost) || 0,
          sellingPrice: Number(form.sellingPrice) || Number(form.unitCost) || 0,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      toast.success(editing ? "Inventory item updated" : "Item added to inventory", toastId);
      setShowAdd(false);
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save", toastId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Inventory</h1>
          <p className="text-black/50 mt-1">Stock updates automatically from sales and purchases too.</p>
        </div>
        <button onClick={startAdd} className="btn-primary text-sm px-4 py-2">+ Add Item</button>
      </div>

      {showAdd && (
        <div className="card p-5 mt-4 space-y-3">
          <h2 className="font-medium">{editing ? "Edit item" : "Add a new item"}</h2>
          <input className="input" placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!!editing} />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-black/40">Quantity</label>
              <input type="number" className="input mt-1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-black/40">Cost price</label>
              <input type="number" className="input mt-1" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-black/40">Selling price</label>
              <input type="number" className="input mt-1" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary flex-1 text-sm">
              {saving ? "Saving…" : editing ? "Save changes" : "Add item"}
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button>
          </div>
        </div>
      )}

      <div className="card mt-4 divide-y divide-black/5">
        {stock.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">
            No inventory yet. Add an item above, or log a purchase and it'll appear here automatically.
          </p>
        ) : (
          stock.map((item) => {
            const qty = Math.max(0, item.quantity || 0);
            return (
              <button key={item.id} onClick={() => startEdit(item)} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-black/[0.02]">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <p className="text-xs text-black/40 mt-0.5">Sells for {formatNaira(item.sellingPrice || item.unitCost || 0)}</p>
                </div>
                <span className={`text-sm ${qty <= 3 ? "text-red-600 font-semibold" : "text-black/60"}`}>
                  {qty} in stock
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
