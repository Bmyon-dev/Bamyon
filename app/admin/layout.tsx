"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";

const NAV = [
  { href: "/admin", label: "Businesses" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/transfers", label: "Transfers" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/staff", label: "Staff Directory" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/design", label: "Design Requests" },
  { href: "/admin/ads", label: "Ad Requests" },
  { href: "/admin/website", label: "Website Requests" },
  { href: "/admin/automation", label: "Automation" },
  { href: "/admin/messages", label: "Messages" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (isLoginPage || loading) return;
    if (!firebaseUser) {
      router.push("/admin/login");
      return;
    }
    if (userDoc && userDoc.role !== "admin") {
      router.push("/dashboard");
    }
  }, [firebaseUser, userDoc, loading, isLoginPage, router]);

  useEffect(() => {
    if (isLoginPage || !firebaseUser) return;
    const t = setTimeout(() => {
      if (!userDoc) setStuck(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [isLoginPage, firebaseUser, userDoc]);

  if (isLoginPage) return <>{children}</>;

  if (stuck) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card p-6 text-center max-w-sm">
          <p className="text-3xl">⚠️</p>
          <h2 className="font-display font-bold text-lg mt-2">This is taking too long</h2>
          <p className="text-black/50 text-sm mt-1">
            Your admin account couldn't be loaded — check the toast notification for details.
          </p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => window.location.reload()} className="btn-primary flex-1 text-sm">
              Retry
            </button>
            <button
              onClick={async () => { await signOut(auth); router.push("/admin/login"); }}
              className="btn-secondary flex-1 text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !userDoc || userDoc.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center text-black/40">Loading…</div>;
  }

  async function handleLogout() {
    await signOut(auth);
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-bamyon-cream">
      <header className="bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo size="text-lg" />
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`text-sm px-4 py-2 rounded-full font-medium ${
                  pathname === n.href ? "bg-bamyon-green text-white" : "text-black/60 hover:bg-black/5"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <button onClick={handleLogout} className="text-sm text-black/50">Logout</button>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
