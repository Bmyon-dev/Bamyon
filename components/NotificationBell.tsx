"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";

interface NotificationItem {
  id: string;
  text: string;
  href: string;
}

export default function NotificationBell() {
  const { business } = useAuth();
  const [open, setOpen] = useState(false);
  const [pendingDebtors, setPendingDebtors] = useState(0);
  const [awaitingOrders, setAwaitingOrders] = useState(0);
  const [lowStock, setLowStock] = useState<string[]>([]);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(collection(db, "businesses", business.id, "debtors"), where("balance", ">", 0));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setPendingDebtors(snap.docs.filter((d: any) => !d.data().approved).length),
      () => {}, // notifications are best-effort — don't spam toasts for this
      "Notifications (debtors)"
    );
    return unsub;
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(
      collection(db, "storeOrders"),
      where("businessId", "==", business.id),
      where("status", "==", "awaiting_confirmation")
    );
    const unsub = listenWithErrorToast(q, (snap) => setAwaitingOrders(snap.size), () => {}, "Notifications (orders)");
    return unsub;
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "inventory"),
      (snap) => setLowStock(
        snap.docs
          .filter((d: any) => (d.data().quantity ?? 0) <= 3 && (d.data().quantity ?? 0) >= 0)
          .map((d: any) => d.data().name)
      ),
      () => {},
      "Notifications (inventory)"
    );
    return unsub;
  }, [business?.id]);

  const items: NotificationItem[] = [
    ...(pendingDebtors > 0 ? [{ id: "debtors", text: `${pendingDebtors} debt${pendingDebtors === 1 ? "" : "s"} awaiting approval`, href: "/dashboard/debtors" }] : []),
    ...(awaitingOrders > 0 ? [{ id: "orders", text: `${awaitingOrders} order${awaitingOrders === 1 ? "" : "s"} awaiting confirmation`, href: "/dashboard/orders" }] : []),
    ...(lowStock.length > 0 ? [{ id: "stock", text: `Low stock: ${lowStock.slice(0, 3).join(", ")}${lowStock.length > 3 ? "…" : ""}`, href: "/dashboard/inventory" }] : []),
  ];

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative w-9 h-9 rounded-full bg-black/5 flex items-center justify-center">
        🔔
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 card p-2 z-40">
            {items.length === 0 ? (
              <p className="text-black/40 text-sm p-4 text-center">You're all caught up 🎉</p>
            ) : (
              items.map((n) => (
                <Link key={n.id} href={n.href} onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm rounded-lg hover:bg-black/5">
                  {n.text}
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
