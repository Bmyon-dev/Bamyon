"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, doc, setDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira, formatDate } from "@/lib/format";
import { decreaseInventory, slugifyItemName } from "@/lib/inventory";
import { planUnlocks } from "@/lib/permissions";
import ReceiptScanner from "@/components/ReceiptScanner";
import { ExtractedItem } from "@/lib/pollinationsVision";
import { AutomationSettingsDoc, InventoryItemDoc } from "@/lib/types";

interface Item { name: string; qty: number; price: number }
interface RecentSale { id: string; items: string; total: number; createdAt: number; status: string }

const emptyItems = (): Item[] => [{ name: "", qty: 1, price: 0 }];

export default function SalesForm({ homeHref = "/dashboard" }: { homeHref?: string }) {
  const { business, userDoc } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Item[]>(emptyItems());
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState<"paid" | "owing">("paid");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [automation, setAutomation] = useState<AutomationSettingsDoc | null>(null);
  const [inventory, setInventory] = useState<InventoryItemDoc[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lastLogged, setLastLogged] = useState<{ total: number; items: string } | null>(null);

  const isPremium = planUnlocks(business, "premium");
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      doc(db, "businesses", business.id, "automation", "config"),
      (snap) => setAutomation(snap.exists() ? (snap.data() as AutomationSettingsDoc) : null),
      toast.error,
      "Automation status"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "inventory"),
      (snap) => setInventory(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as InventoryItemDoc))),
      toast.error,
      "Inventory"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "sales"),
      (snap) => {
        const rows = snap.docs
          .map((d: any) => ({ id: d.id, ...d.data() } as RecentSale))
          .sort((a: RecentSale, b: RecentSale) => b.createdAt - a.createdAt)
          .slice(0, 5);
        setRecentSales(rows);
      },
      toast.error,
      "Recent sales"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function handleNameChange(idx: number, name: string) {
    const match = inventory.find((inv) => inv.name.toLowerCase() === name.toLowerCase());
    updateItem(idx, match ? { name, price: match.sellingPrice || match.unitCost || 0 } : { name });
  }

  function stockFor(name: string): number | null {
    const match = inventory.find((inv) => inv.name.toLowerCase() === name.toLowerCase());
    return match ? Math.max(0, match.quantity || 0) : null;
  }

  function handleScanned(scanned: ExtractedItem[], counterpartyName?: string) {
    setItems(scanned.map((it) => ({ name: it.name, qty: it.qty, price: it.price })));
    if (counterpartyName && !customerName) setCustomerName(counterpartyName);
  }

  async function triggerReviewAutomation(saleTotal: number, name: string, phone: string) {
    if (!automation?.active || !automation.googleReviewLink || !phone || !business) return;
    try {
      await fetch("/api/automation/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: business.name,
          customerName: name,
          customerPhone: phone,
          googleReviewLink: automation.googleReviewLink,
          saleTotal,
        }),
      });
    } catch (err) {
      console.error("Review automation trigger failed:", err);
    }
  }

  async function handleSubmit() {
    if (!business?.id || total <= 0) return;
    setSaving(true);
    const toastId = toast.loading("Logging sale…");
    try {
      const validItems = items.filter((i) => i.name);
      const itemsLabel = validItems.map((i) => `${i.qty}× ${i.name}`).join(", ");

      await addDoc(collection(db, "businesses", business.id, "sales"), {
        items: itemsLabel || "Sale",
        lineItems: validItems,
        total,
        customerName,
        customerPhone,
        customerEmail,
        status,
        notes,
        loggedBy: userDoc?.name || "",
        createdAt: Date.now(),
      });

      await Promise.all(
        validItems.map((i) => decreaseInventory(business.id, i.name, i.qty))
      );

      if (status === "owing") {
        await setDoc(
          doc(collection(db, "businesses", business.id, "debtors")),
          {
            customerName: customerName || "Unnamed customer",
            customerPhone,
            customerEmail,
            balance: total,
            approved: false, // owner/staff must confirm this debt before it's final
            loggedBy: userDoc?.name || "",
            lastSaleAt: Date.now(),
          }
        );
      }

      if (customerName || customerPhone || customerEmail) {
        const customerId = slugifyItemName(customerPhone || customerEmail || customerName);
        await setDoc(
          doc(db, "businesses", business.id, "customers", customerId),
          {
            name: customerName || "Customer",
            phone: customerPhone || "",
            email: customerEmail || "",
            totalSpent: increment(total),
            lastSaleAt: Date.now(),
          },
          { merge: true }
        );
      }

      toast.success(`Sale logged — ${formatNaira(total)}`, toastId);
      setLastLogged({ total, items: itemsLabel });
      triggerReviewAutomation(total, customerName, customerPhone);

      // Stay right here — reset the form for the next sale instead of
      // navigating away.
      setItems(emptyItems());
      setCustomerName(""); setCustomerPhone(""); setCustomerEmail("");
      setStatus("paid"); setNotes("");
      setTimeout(() => setLastLogged(null), 6000);
    } catch (err: any) {
      toast.error(err.message || "Failed to log sale", toastId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Log a Sale</h1>
      <p className="text-black/50 mt-1">Record items sold — inventory updates automatically</p>

      {lastLogged && (
        <div className="card p-4 mt-4 bg-bamyon-green/10 border border-bamyon-green flex items-center gap-2">
          <span className="text-bamyon-green text-lg">✓</span>
          <div>
            <p className="font-medium text-bamyon-green text-sm">Sale logged successfully</p>
            <p className="text-xs text-black/50">{lastLogged.items} — {formatNaira(lastLogged.total)}</p>
          </div>
        </div>
      )}

      {isPremium ? (
        <ReceiptScanner kind="sale" onExtracted={handleScanned} />
      ) : (
        <div className="card p-4 mt-4 flex items-center justify-between">
          <p className="text-sm text-black/50">🔒 Scan a receipt with AI is a Premium feature.</p>
          <a href="/dashboard/upgrade" className="text-bamyon-green text-sm font-medium shrink-0 ml-3">Upgrade</a>
        </div>
      )}

      <div className="card p-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Items Sold</h2>
          {inventory.length > 0 && <span className="text-xs text-black/40">Type a product name to pull it from inventory</span>}
        </div>
        <datalist id="inventory-items">
          {inventory.map((inv) => <option key={inv.id} value={inv.name} />)}
        </datalist>
        {items.map((item, idx) => {
          const stock = stockFor(item.name);
          return (
            <div key={idx} className="mb-2">
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="input col-span-1"
                  placeholder="Item name"
                  list="inventory-items"
                  value={item.name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={item.qty}
                  onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                />
                <input
                  type="number"
                  min={0}
                  className="input"
                  placeholder="Price"
                  value={item.price || ""}
                  onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                />
              </div>
              {stock !== null && stock < item.qty && (
                <p className="text-xs text-amber-700 mt-1">Only {stock} in stock — logging anyway will take stock negative.</p>
              )}
            </div>
          );
        })}
        <button
          onClick={() => setItems((p) => [...p, { name: "", qty: 1, price: 0 }])}
          className="text-bamyon-green text-sm font-medium mt-1"
        >
          + Add another item
        </button>
        <div className="flex items-center justify-between border-t border-black/5 mt-4 pt-4">
          <span className="text-black/60">Total</span>
          <span className="font-bold text-lg">{formatNaira(total)}</span>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="font-medium mb-3">Customer Info (optional)</h2>
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="input" placeholder="Phone number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>
        <input
          className="input mt-3"
          placeholder="Email (optional — enables CRM email campaigns later)"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
        />
        {automation?.active && (
          <p className="text-xs text-bamyon-green mt-2">
            ✓ Review automation is on — this customer gets a review request if you add their phone number.
          </p>
        )}
      </div>

      <div className="card p-5 mt-4">
        <h2 className="font-medium mb-3">Payment Status</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStatus("paid")}
            className={`rounded-xl border py-3 font-medium ${status === "paid" ? "border-bamyon-green text-bamyon-green bg-bamyon-green/5" : "border-black/10 text-black/50"}`}
          >
            ✓ Paid
          </button>
          <button
            onClick={() => setStatus("owing")}
            className={`rounded-xl border py-3 font-medium ${status === "owing" ? "border-bamyon-amber text-bamyon-amberDark bg-bamyon-amber/10" : "border-black/10 text-black/50"}`}
          >
            ⏳ Owing
          </button>
        </div>
        {status === "owing" && (
          <p className="text-xs text-black/40 mt-2">
            This will be added to Debtors as pending until it's approved there.
          </p>
        )}
      </div>

      <div className="card p-5 mt-4">
        <textarea className="input" placeholder="Notes (optional)…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || total <= 0}
        className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
      >
        {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
        {saving ? "Saving…" : `🛒 Log Sale — ${formatNaira(total)}`}
      </button>

      {recentSales.length > 0 && (
        <div className="card mt-6 divide-y divide-black/5">
          <h2 className="font-display font-bold px-5 pt-4 pb-2">Recent Sales</h2>
          {recentSales.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p>{s.items}</p>
                <p className="text-xs text-black/40">{formatDate(s.createdAt)}</p>
              </div>
              <span className="font-semibold">{formatNaira(s.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
