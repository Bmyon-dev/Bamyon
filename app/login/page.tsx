"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Logo from "@/components/Logo";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const submittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError("");
    submittingRef.current = true;
    setLoading(true);
    setStatus("Logging in…");

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setStatus("Loading your dashboard…");
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) {
        setError("No account found for this login.");
        submittingRef.current = false;
        setLoading(false);
        setStatus("");
        return;
      }
      const role = snap.data().role;
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "staff") {
        router.push("/staff");
      } else {
        // Owner: resume onboarding if it wasn't finished, otherwise go
        // straight to the dashboard. No email verification gate anymore.
        const businessId = snap.data().businessId;
        const bizSnap = businessId ? await getDoc(doc(db, "businesses", businessId)) : null;
        if (bizSnap?.exists() && bizSnap.data().onboarded) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      }
    } catch (err: any) {
      submittingRef.current = false;
      setLoading(false);
      setStatus("");
      const code = err?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Incorrect email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError(err.message?.replace("Firebase: ", "") || "Login failed.");
      }
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-6">
        <Logo />
        <h1 className="font-display text-2xl font-bold mt-4">Welcome back</h1>
        <p className="text-black/60 text-sm mt-1">Business owners and staff both log in here.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <fieldset disabled={loading} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Password</label>
              <Link href="/forgot-password" className="text-xs text-bamyon-green font-medium">
                Forgot password?
              </Link>
            </div>
            <input type="password" className="input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </fieldset>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {status || "Log In"}
        </button>
        <p className="text-center text-sm text-black/60">
          New here?{" "}
          <Link href="/signup" className="text-bamyon-green font-medium">Create a free account</Link>
        </p>
      </form>
    </main>
  );
}
