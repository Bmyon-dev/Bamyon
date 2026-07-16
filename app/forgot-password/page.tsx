"use client";

import { useRef, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "@/components/Logo";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || !email.trim()) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err: any) {
      // Don't reveal whether the email exists — just show a generic success
      // state either way, which is both friendlier and more secure.
      setSent(true);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-20">
      <div className="text-center mb-6">
        <Logo />
        <h1 className="font-display text-2xl font-bold mt-4">Reset your password</h1>
        <p className="text-black/60 text-sm mt-1">
          Enter the email on your account and we'll send a reset link.
        </p>
      </div>

      {sent ? (
        <div className="card p-6 text-center space-y-3">
          <p className="text-3xl">📩</p>
          <p className="font-medium">Check your inbox</p>
          <p className="text-black/50 text-sm">
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
          </p>
          <Link href="/login" className="text-bamyon-green font-medium text-sm block mt-2">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
          <p className="text-center text-sm text-black/60">
            <Link href="/login" className="text-bamyon-green font-medium">Back to login</Link>
          </p>
        </form>
      )}
    </main>
  );
}
