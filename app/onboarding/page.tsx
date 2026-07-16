"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Logo from "@/components/Logo";

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const { userDoc, loading: authLoading } = useAuth();
  const [address, setAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function finish(skip = false) {
    setError("");

    if (!userDoc?.businessId) {
      // This should be rare now that signup writes atomically, but if it
      // ever happens, say so instead of doing nothing.
      const msg = "Still loading your account — please wait a moment and try again.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);
    const toastId = toast.loading(skip ? "Skipping for now…" : "Saving your business profile…");
    try {
      await setDoc(
        doc(db, "businesses", userDoc.businessId),
        skip
          ? { onboarded: true }
          : {
              address,
              businessPhone,
              whatsappNumber: whatsapp || businessPhone,
              onboarded: true,
            },
        { merge: true }
      );
      toast.success("You're all set!", toastId);
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.code === "permission-denied"
        ? "Firestore rules denied this save — check firestore.rules is deployed."
        : err.message || "Failed to save. Please try again.";
      setError(msg);
      toast.error(msg, toastId);
      console.error("Onboarding save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <main className="max-w-md mx-auto px-6 py-24 text-center">
        <Logo />
        <p className="text-black/40 text-sm mt-6">Loading your account…</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-6 py-10">
      <div className="text-center mb-6">
        <Logo />
        <h1 className="font-display text-2xl font-bold mt-4">
          Let's complete your business profile
        </h1>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-bamyon-green text-white flex items-center justify-center text-sm">✓</div>
        <div className="w-10 h-0.5 bg-bamyon-green" />
        <div className="w-8 h-8 rounded-full bg-bamyon-green text-white flex items-center justify-center text-sm">2</div>
        <div className="w-10 h-0.5 bg-black/10" />
        <div className="w-8 h-8 rounded-full bg-black/10 text-black/40 flex items-center justify-center text-sm">3</div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-display font-bold text-lg">Business Profile Setup</h2>
        <p className="text-black/60 text-sm">
          Add your contact details so customers can reach you and order from
          your catalogue.
        </p>
        <div className="bg-bamyon-green/10 text-bamyon-green rounded-xl px-4 py-3 text-sm font-medium">
          ✓ Bamyon is registered on the Free plan
        </div>

        <div>
          <label className="text-sm font-medium">Business Address</label>
          <input
            className="input mt-1"
            placeholder="e.g. 12 Aba Road, Port Harcourt"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Business Phone</label>
          <input
            className="input mt-1"
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">WhatsApp Number</label>
          <input
            className="input mt-1"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
          <p className="text-xs text-black/40 mt-1">
            Customers will order via this WhatsApp number from your catalogue.
          </p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button onClick={() => finish(false)} disabled={saving} className="btn-amber w-full flex items-center justify-center gap-2">
          {saving && <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
          {saving ? "Saving…" : "Launch My Dashboard →"}
        </button>
        <button onClick={() => finish(true)} disabled={saving} className="text-black/40 text-sm w-full text-center">
          Skip for now
        </button>
      </div>
    </main>
  );
}
