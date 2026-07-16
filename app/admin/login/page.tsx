"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Logo from "@/components/Logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists() || snap.data().role !== "admin") {
        await signOut(auth);
        setError("This login is not a Bamyon admin account.");
        setLoading(false);
        return;
      }
      router.push("/admin");
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "") || "Login failed.");
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-20">
      <div className="text-center mb-6">
        <Logo />
        <p className="text-black/40 text-sm mt-1">Admin Console</p>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <input type="email" className="input" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>
    </main>
  );
}
