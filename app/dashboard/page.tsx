"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import StatCard from "@/components/StatCard";
import { formatNaira } from "@/lib/format";

interface SaleRow {
  id: string;
  total: number;
  createdAt: number;
  items: string;
  status: "paid" | "owing";
}

export default function DashboardHome() {
  const { business, userDoc } = useAuth();
  const toast = useToast();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [purchasesTotal, setPurchasesTotal] = useState(0);
  const [debtorsCount, setDebtorsCount] = useState(0);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(
      collection(db, "businesses", business.id, "sales"),
      where("createdAt", ">=", startOfDay.getTime())
    );
    const unsub = listenWithErrorToast(
      q,
      (snap) => setSales(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SaleRow))),
      toast.error,
      "Today's sales"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(
      collection(db, "businesses", business.id, "purchases"),
      where("createdAt", ">=", startOfDay.getTime())
    );
    const unsub = listenWithErrorToast(
      q,
      (snap) => setPurchasesTotal(snap.docs.reduce((sum: number, d: any) => sum + (d.data().total || 0), 0)),
      toast.error,
      "Today's purchases"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(
      collection(db, "businesses", business.id, "debtors"),
      where("balance", ">", 0)
    );
    const unsub = listenWithErrorToast(q, (snap) => setDebtorsCount(snap.size), toast.error, "Debtors count");
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  const salesTotal = sales.reduce((s, r) => s + r.total, 0);
  const balance = salesTotal - purchasesTotal;
  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">
        Good {greeting()} 👋
      </h1>
      <p className="text-black/50 mt-1">
        Here's your business summary for today, {today}
      </p>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <StatCard icon="📈" iconBg="bg-bamyon-green/10" badge="Today" label="Total Sales" sublabel={`${sales.length} transactions`} value={formatNaira(salesTotal)} />
        <StatCard icon="📉" iconBg="bg-red-500/10" badge="Today" label="Purchases" sublabel="0 purchases" value={formatNaira(purchasesTotal)} />
        <StatCard icon="$" iconBg="bg-bamyon-green/10" badge="Profit" label="Today's Balance" sublabel="Sales minus purchases" value={formatNaira(balance)} valueColor="text-bamyon-green" />
        <StatCard icon="👥" iconBg="bg-bamyon-amber/10" label="Total Debtors" sublabel="customers owing" value={String(debtorsCount)} />
      </div>

      <h2 className="font-display font-bold mt-8 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/sales" className="btn-primary flex items-center gap-2 justify-center">🛒 Log a Sale</Link>
        <Link href="/dashboard/purchases" className="card flex items-center gap-2 justify-center py-3 text-black/50">↘ Log Purchase</Link>
        <Link href="/dashboard/debtors" className="card flex items-center gap-2 justify-center py-3 text-black/50">👥 View Debtors</Link>
        <Link href="/dashboard/receipts" className="card flex items-center gap-2 justify-center py-3 text-bamyon-amberDark bg-bamyon-amber/10">🧾 Generate Receipt</Link>
      </div>

      <div className="card p-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold">Today's Sales</h2>
          <Link href="/dashboard/sales" className="text-bamyon-green text-sm font-medium">View all →</Link>
        </div>
        {sales.length === 0 ? (
          <p className="text-black/40 text-sm py-6 text-center">
            No sales logged yet today. Tap "Log a Sale" to record your first one.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {sales.slice(0, 5).map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between text-sm">
                <span>{s.items}</span>
                <span className="font-semibold">{formatNaira(s.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
