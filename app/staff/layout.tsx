"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import StaffSidebar from "@/components/StaffSidebar";
import NotificationBell from "@/components/NotificationBell";
import ThemeWrapper from "@/components/ThemeWrapper";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.push("/login");
      return;
    }
    if (userDoc && userDoc.role === "owner") {
      router.push("/dashboard");
    }
    if (userDoc && userDoc.role === "admin") {
      router.push("/admin");
    }
  }, [loading, firebaseUser, userDoc, router]);

  useEffect(() => {
    if (!firebaseUser) return;
    const t = setTimeout(() => {
      if (!userDoc) setStuck(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [firebaseUser, userDoc]);

  if (stuck) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card p-6 text-center max-w-sm">
          <p className="text-3xl">⚠️</p>
          <h2 className="font-display font-bold text-lg mt-2">This is taking too long</h2>
          <p className="text-black/50 text-sm mt-1">
            Your account couldn't be loaded — check the toast notification for details.
          </p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => window.location.reload()} className="btn-primary flex-1 text-sm">
              Retry
            </button>
            <button
              onClick={async () => { await signOut(auth); router.push("/login"); }}
              className="btn-secondary flex-1 text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !userDoc) {
    return <div className="min-h-screen flex items-center justify-center text-black/40">Loading…</div>;
  }

  return (
    <ThemeWrapper>
    <div className="min-h-screen flex bg-bamyon-cream">
      <aside className="hidden sm:block">
        <StaffSidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0">
            <StaffSidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-black/5">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="sm:hidden">☰</button>
          <span className="text-sm text-black/50 hidden sm:block">Staff</span>
          <NotificationBell />
        </header>
        <main className="px-5 py-6 sm:px-8 sm:py-8 max-w-5xl mx-auto">{children}</main>
      </div>
    </div>
    </ThemeWrapper>
  );
}
