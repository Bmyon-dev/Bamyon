"use client";

import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/format";

interface Row {
  id: string;
  businessId: string;
  active: boolean;
  googleReviewLink: string;
  activatedAt: number | null;
}

export default function AdminAutomationPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      collectionGroup(db, "automation"),
      (snap) => {
        setRows(
          snap.docs.map((d) => ({
            id: d.id,
            businessId: d.ref.parent.parent?.id || "",
            active: d.data().active,
            googleReviewLink: d.data().googleReviewLink,
            activatedAt: d.data().activatedAt,
          }))
        );
      },
      (err) => {
        console.error("Automation collectionGroup query failed:", err);
        setError(err.message);
      }
    );
    return unsub;
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Review Automation</h1>
      <p className="text-black/50 mt-1">Every business that has activated automatic review requests.</p>

      {error && (
        <div className="card p-4 mt-4 text-sm text-red-600">
          Couldn't load this list: {error}
        </div>
      )}

      <div className="card mt-5 divide-y divide-black/5">
        {rows.length === 0 ? (
          <p className="text-black/40 text-sm p-6 text-center">No businesses have activated this yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.businessId} className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{r.businessId}</p>
                <a href={r.googleReviewLink} target="_blank" className="text-xs text-bamyon-green truncate block">
                  {r.googleReviewLink}
                </a>
                <p className="text-xs text-black/40 mt-1">Activated {formatDate(r.activatedAt)}</p>
              </div>
              <span className={`text-xs font-semibold rounded-full px-3 py-1 shrink-0 ml-3 ${
                r.active ? "bg-bamyon-green/10 text-bamyon-green" : "bg-black/5 text-black/50"
              }`}>
                {r.active ? "Active" : "Paused"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
