"use client";

import { useEffect, useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira } from "@/lib/format";

interface StockItem { id: string; name: string; quantity: number; unitCost: number }

export default function NetWorthView() {
  const { business } = useAuth();
  const toast = useToast();
  const [stock, setStock] = useState<StockItem[]>([]);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "inventory"),
      (snap) => setStock(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as StockItem))),
      toast.error,
      "Net worth"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  const inventoryValue = stock.reduce((sum, item) => sum + Math.max(0, item.quantity || 0) * (item.unitCost || 0), 0);
  const walletBalance = business?.walletBalance || 0;
  const netWorth = inventoryValue + walletBalance;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Net Worth</h1>
      <p className="text-black/50 mt-1">
        What your business is worth right now, calculated automatically from your stock and wallet.
      </p>

      <div className="card p-6 mt-5 bg-bamyon-green text-white">
        <p className="text-white/70 text-sm">Estimated Net Worth</p>
        <p className="text-3xl font-extrabold mt-1">{formatNaira(netWorth)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="card p-5">
          <p className="text-black/50 text-sm">Inventory Value</p>
          <p className="text-xl font-bold mt-1">{formatNaira(inventoryValue)}</p>
          <p className="text-xs text-black/40 mt-1">{stock.length} item{stock.length === 1 ? "" : "s"} tracked</p>
        </div>
        <div className="card p-5">
          <p className="text-black/50 text-sm">Wallet Balance</p>
          <p className="text-xl font-bold mt-1">{formatNaira(walletBalance)}</p>
        </div>
      </div>

      <div className="card mt-4 divide-y divide-black/5">
        <h2 className="font-display font-bold px-5 pt-4 pb-2">Inventory breakdown</h2>
        {stock.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">
            Log a purchase to start tracking inventory value.
          </p>
        ) : (
          stock.map((item) => {
            const qty = Math.max(0, item.quantity || 0);
            return (
              <div key={item.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{item.name}</span>
                <span className="text-black/60">
                  {qty} × {formatNaira(item.unitCost || 0)} ={" "}
                  <span className="font-semibold text-black">{formatNaira(qty * (item.unitCost || 0))}</span>
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-black/40 mt-3">
        This is an estimate based on the last logged cost per item and current stock levels — not an
        audited valuation.
      </p>
    </div>
  );
}
