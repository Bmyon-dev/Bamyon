"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { formatDate, formatNaira } from "@/lib/format";
import { StoreOrderDoc } from "@/lib/types";

export default function OrdersList() {
  const { business } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState<StoreOrderDoc[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!business?.id) return;
    const q = query(
      collection(db, "storeOrders"),
      where("businessId", "==", business.id),
      orderBy("createdAt", "desc")
    );
    const unsub = listenWithErrorToast(
      q,
      (snap) => setOrders(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as StoreOrderDoc))),
      toast.error,
      "Orders"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  async function resolve(id: string, status: "confirmed" | "cancelled") {
    setBusyId(id);
    const toastId = toast.loading(status === "confirmed" ? "Confirming order…" : "Cancelling order…");
    try {
      await updateDoc(doc(db, "storeOrders", id), { status });
      toast.success(status === "confirmed" ? "Order confirmed" : "Order cancelled", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to update", toastId);
    } finally {
      setBusyId(null);
    }
  }

  const awaiting = orders.filter((o) => o.status === "awaiting_confirmation");
  const resolved = orders.filter((o) => o.status !== "awaiting_confirmation");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Orders</h1>
      <p className="text-black/50 mt-1">Online-payment orders placed through your catalogue link.</p>

      <h2 className="font-display font-bold mt-6 mb-2 text-bamyon-amberDark">
        Awaiting Confirmation ({awaiting.length})
      </h2>
      <div className="card divide-y divide-black/5 border-2 border-bamyon-amber/40">
        {awaiting.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">Nothing waiting 🎉</p>
        ) : (
          awaiting.map((o) => (
            <div key={o.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{o.buyerName}</p>
                  <p className="text-xs text-black/40">{o.buyerEmail} · {o.buyerPhone}</p>
                </div>
                <p className="font-bold">{formatNaira(o.total)}</p>
              </div>
              <p className="text-xs text-black/50 mt-1">
                {o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
              </p>
              <p className="text-xs text-black/30 mt-1">{formatDate(o.createdAt)}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => resolve(o.id, "confirmed")} disabled={busyId === o.id} className="btn-primary text-xs px-3 py-1.5">
                  Confirm — Payment Received
                </button>
                <button onClick={() => resolve(o.id, "cancelled")} disabled={busyId === o.id} className="text-red-600 text-xs font-medium">
                  Cancel
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <h2 className="font-display font-bold mt-6 mb-2">History</h2>
      <div className="card divide-y divide-black/5">
        {resolved.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No resolved orders yet.</p>
        ) : (
          resolved.map((o) => (
            <div key={o.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium">{o.buyerName}</p>
                <p className="text-xs text-black/40">{formatDate(o.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatNaira(o.total)}</p>
                <p className={`text-xs capitalize ${o.status === "confirmed" ? "text-bamyon-green" : "text-red-600"}`}>{o.status}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
