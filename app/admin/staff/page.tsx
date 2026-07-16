"use client";

import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";

interface StaffRow {
  id: string;
  businessId: string;
  name: string;
  email: string;
  photoUrl?: string;
  createdAt: number;
}

export default function AdminStaffPage() {
  const toast = useToast();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      collectionGroup(db, "staff"),
      (snap) => {
        setStaff(
          snap.docs.map((d) => ({
            id: d.id,
            businessId: d.ref.parent.parent?.id || "",
            name: d.data().name,
            email: d.data().email,
            photoUrl: d.data().photoUrl,
            createdAt: d.data().createdAt,
          }))
        );
      },
      (err) => {
        console.error("Staff directory error:", err);
        setError(err.message);
        toast.error(`Staff directory: ${err.message}`);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Staff Directory</h1>
      <p className="text-black/50 mt-1">Every staff account across every business.</p>

      {error && <div className="card p-4 mt-4 text-sm text-red-600">Couldn't load: {error}</div>}

      <div className="card mt-5 divide-y divide-black/5">
        {staff.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No staff accounts yet.</p>
        ) : (
          staff.map((s) => (
            <div key={`${s.businessId}-${s.id}`} className="flex items-center gap-3 px-5 py-3">
              {s.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photoUrl} alt={s.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-xs font-bold">
                  {s.name?.[0]?.toUpperCase() || "S"}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-xs text-black/40">{s.email}</p>
              </div>
              <a href={`/admin/businesses/${s.businessId}`} className="text-bamyon-green text-xs font-medium">View business</a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
