"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import Logo from "@/components/Logo";
import Link from "next/link";

const CATEGORIES = [
  "Retail / Store",
  "Fashion & Beauty",
  "Food & Drinks",
  "Electronics",
  "Salon / Spa",
  "Services",
  "Other",
];

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const toast = useToast();
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    category: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const submittingRef = useRef(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.businessName || !form.ownerName || !form.email || !form.category) {
      setError("Please fill in every field.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setStatus("Creating your account…");
    const toastId = toast.loading("Creating your account…");

    let uid: string | null = null;
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      uid = cred.user.uid;
      const businessId = uid;

      setStatus("Setting up your business…");
      toast.success("Account created — setting up your business…", toastId);

      // Both documents are written in ONE atomic batch — either both land
      // or neither does, so there's no race between them and no window
      // where one exists without the other.
      const batch = writeBatch(db);

      batch.set(doc(db, "businesses", businessId), {
        name: form.businessName,
        ownerName: form.ownerName,
        ownerUid: uid,
        email: form.email,
        phone: form.phone,
        category: form.category,
        address: "",
        businessPhone: "",
        whatsappNumber: "",
        plan: "free",
        planExpiry: null,
        walletBalance: 0,
        currency: "NGN",
        emailVerified: false,
        onboarded: false,
        referredBy: referralCode && referralCode !== businessId ? referralCode : null,
        createdAt: Date.now(),
      });

      batch.set(doc(db, "users", uid), {
        uid,
        role: "owner",
        businessId,
        email: form.email,
        name: form.ownerName,
        createdAt: Date.now(),
      });

      if (referralCode && referralCode !== businessId) {
        batch.set(doc(db, "referrals", businessId), {
          referrerBusinessId: referralCode,
          referredBusinessId: businessId,
          referredBusinessName: form.businessName,
          bonusPaid: false,
          createdAt: Date.now(),
        });
      }

      const batchToastId = toast.loading("Saving your business profile…");
      await batch.commit();
      toast.success("Business profile saved", batchToastId);

      // Verification email still fires in the background for their
      // records, but it no longer gates anything — straight to onboarding.
      sendEmailVerification(cred.user).catch((err) => {
        console.error("sendEmailVerification failed (non-blocking):", err);
      });

      router.push("/onboarding");
    } catch (err: any) {
      submittingRef.current = false;
      setLoading(false);
      setStatus("");
      const code = err?.code || "";
      let msg: string;
      if (code === "auth/email-already-in-use") {
        msg = "That email already has an account. Try logging in instead.";
      } else if (code === "auth/invalid-email") {
        msg = "That email address doesn't look right.";
      } else if (code === "auth/weak-password") {
        msg = "Please choose a stronger password (6+ characters).";
      } else if (code === "permission-denied") {
        msg = "Your account was created, but saving your business profile was denied by Firestore rules. Please contact support with this error.";
      } else {
        msg = err.message?.replace("Firebase: ", "") || "Something went wrong. Please try again.";
      }
      setError(msg);
      toast.error(msg);
      console.error("Signup failed:", { code, uid, error: err });
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-10">
      <div className="text-center mb-6">
        <Logo />
        <h1 className="font-display text-2xl font-bold mt-4">Create your free account</h1>
        <p className="text-black/60 text-sm mt-1">
          Start managing your business in minutes — free forever.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <fieldset disabled={loading} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Business Name</label>
            <input className="input mt-1" placeholder="e.g. Mama Ngozi Superstore" value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Owner Name</label>
            <input className="input mt-1" placeholder="Your full name" value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input type="email" className="input mt-1" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input className="input mt-1" placeholder="0811 277 2267" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Business Category</label>
            <select className="input mt-1" value={form.category} onChange={(e) => update("category", e.target.value)}>
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Password</label>
              <input type="password" className="input mt-1" value={form.password} onChange={(e) => update("password", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Confirm</label>
              <input type="password" className="input mt-1" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} />
            </div>
          </div>
        </fieldset>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {status || "Create Free Account"}
        </button>

        <p className="text-center text-sm text-black/60">
          Already have an account?{" "}
          <Link href="/login" className="text-bamyon-green font-medium">Log in</Link>
        </p>
        <p className="text-center text-xs text-black/40">
          Every business starts on the Free plan. Upgrade anytime from your dashboard.
        </p>
      </form>
    </main>
  );
}
