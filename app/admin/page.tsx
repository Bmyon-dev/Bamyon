"use client";

import { useEffect, useState } from "react";
import { collection, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BusinessDoc } from "@/lib/types";
import { formatNaira, formatDate, isPlanActive } from "@/lib/format";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import { useRouter } from "next/navigation";

export default function AdminBusinessesPage() {
  const toast = useToast();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessDoc[]>([]);

  useEffect(() => {
    const q = query(collection(db, "businesses"), orderBy("createdAt", "desc"));
    const unsub = listenWithErrorToast(
      q,
      (snap) => setBusinesses(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as BusinessDoc))),
      toast.error,
      "Businesses list"
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Businesses</h1>
      <p className="text-black/50 mt-1">Every business registered on Bamyon.</p>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-black/40 border-b border-black/5">
            <tr>
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Expires</th>
              <th className="px-5 py-3">Wallet</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {businesses.map((b) => {
              const active = isPlanActive(b.planExpiry);
              return (
                <tr key={b.id} onClick={() => router.push(`/admin/businesses/${b.id}`)} className="cursor-pointer hover:bg-black/[0.02]">
                  <td className="px-5 py-3 font-medium">{b.name}</td>
                  <td className="px-5 py-3">{b.ownerName}<br /><span className="text-black/40 text-xs">{b.phone}</span></td>
                  <td className="px-5 py-3 capitalize">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${active ? "bg-bamyon-green/10 text-bamyon-green" : "bg-black/5 text-black/50"}`}>
                      {active ? b.plan : "free"}
                    </span>
                  </td>
                  <td className="px-5 py-3">{formatDate(b.planExpiry)}</td>
                  <td className="px-5 py-3">{formatNaira(b.walletBalance)}</td>
                  <td className="px-5 py-3 text-black/40">{formatDate(b.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {businesses.length === 0 && (
          <p className="text-black/40 text-sm p-6 text-center">No businesses yet.</p>
        )}
      </div>
    </div>
  );
}
