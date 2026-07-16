"use client";

import { useEffect, useState } from "react";
import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatNaira } from "@/lib/format";

interface DayRow {
  dateKey: string;
  label: string;
  sales: number;
  purchases: number;
  balance: number;
  transactions: number;
}

const DAYS_BACK = 30;

export default function DailyHistoryView() {
  const { business } = useAuth();
  const toast = useToast();
  const [sales, setSales] = useState<{ total: number; createdAt: number }[]>([]);
  const [purchases, setPurchases] = useState<{ total: number; createdAt: number }[]>([]);

  const since = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (!business?.id) return;
    const q = query(collection(db, "businesses", business.id, "sales"), where("createdAt", ">=", since));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setSales(snap.docs.map((d: any) => ({ total: d.data().total || 0, createdAt: d.data().createdAt }))),
      toast.error,
      "Sales history"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(collection(db, "businesses", business.id, "purchases"), where("createdAt", ">=", since));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setPurchases(snap.docs.map((d: any) => ({ total: d.data().total || 0, createdAt: d.data().createdAt }))),
      toast.error,
      "Purchases history"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  function dayKey(ts: number) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  const byDay = new Map<string, DayRow>();
  for (const s of sales) {
    const key = dayKey(s.createdAt);
    const row = byDay.get(key) || {
      dateKey: key,
      label: new Date(s.createdAt).toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" }),
      sales: 0, purchases: 0, balance: 0, transactions: 0,
    };
    row.sales += s.total;
    row.transactions += 1;
    byDay.set(key, row);
  }
  for (const p of purchases) {
    const key = dayKey(p.createdAt);
    const row = byDay.get(key) || {
      dateKey: key,
      label: new Date(p.createdAt).toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" }),
      sales: 0, purchases: 0, balance: 0, transactions: 0,
    };
    row.purchases += p.total;
    byDay.set(key, row);
  }

  const days = Array.from(byDay.values())
    .map((r) => ({ ...r, balance: r.sales - r.purchases }))
    .sort((a, b) => Number(b.dateKey.split("-").join("")) - Number(a.dateKey.split("-").join("")));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Daily Closings</h1>
      <p className="text-black/50 mt-1">Exact sales, purchases, and balance for any of your last {DAYS_BACK} days.</p>

      <div className="card mt-5 divide-y divide-black/5">
        {days.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No activity in the last {DAYS_BACK} days yet.</p>
        ) : (
          days.map((d) => (
            <div key={d.dateKey} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{d.label}</p>
                <p className={`font-bold ${d.balance >= 0 ? "text-bamyon-green" : "text-red-600"}`}>{formatNaira(d.balance)}</p>
              </div>
              <div className="flex gap-4 mt-1 text-xs text-black/50">
                <span>Sales: {formatNaira(d.sales)}</span>
                <span>Purchases: {formatNaira(d.purchases)}</span>
                <span>{d.transactions} sale{d.transactions === 1 ? "" : "s"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
