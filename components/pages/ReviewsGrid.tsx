"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { listenWithErrorToast } from "@/lib/firestoreListen";
import ImageUpload from "@/components/ImageUpload";

interface Review { id: string; customerName: string; imageUrl: string; createdAt: number }

export default function ReviewsGrid() {
  const { business } = useAuth();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    if (!business?.id) return;
    const unsub = listenWithErrorToast(
      collection(db, "businesses", business.id, "reviews"),
      (snap) => setReviews(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Review))),
      toast.error,
      "Reviews"
    );
    return unsub;
  }, [business?.id]);

  async function saveReview(imageUrl: string) {
    if (!business?.id) return;
    const toastId = toast.loading("Saving review…");
    try {
      await addDoc(collection(db, "businesses", business.id, "reviews"), {
        customerName: customerName || "Customer",
        imageUrl,
        createdAt: Date.now(),
      });
      toast.success("Review added", toastId);
      setCustomerName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save review", toastId);
    }
  }

  async function remove(id: string) {
    if (!business?.id) return;
    const toastId = toast.loading("Removing review…");
    try {
      await deleteDoc(doc(db, "businesses", business.id, "reviews", id));
      toast.success("Review removed", toastId);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove", toastId);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Reviews</h1>
      <p className="text-black/50 mt-1">Screenshots of customer reviews you've collected.</p>

      <div className="card p-5 mt-5 space-y-3">
        <input
          className="input"
          placeholder="Customer name (optional)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <ImageUpload label="Upload review screenshot" onUploaded={saveReview} />
      </div>

      {reviews.length === 0 ? (
        <div className="card p-8 text-center mt-4 text-black/40 text-sm">
          No review screenshots uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {reviews.map((r) => (
            <div key={r.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.imageUrl} alt={`Review from ${r.customerName}`} className="rounded-xl w-full object-cover" />
              <button
                onClick={() => remove(r.id)}
                className="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-full w-6 h-6"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
