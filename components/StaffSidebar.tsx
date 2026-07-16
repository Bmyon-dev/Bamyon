"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getStaffNav } from "@/lib/permissions";
import Logo from "@/components/Logo";

export default function StaffSidebar({ onClose }: { onClose?: () => void }) {
  const { business, userDoc } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const items = getStaffNav(business, userDoc).map((item) => ({
    ...item,
    href: item.href.replace("/dashboard", "/staff"),
  }));

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <div className="bg-bamyon-green text-white h-full flex flex-col w-72 px-4 py-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <Logo size="text-xl" />
          <p className="text-white/60 text-xs mt-0.5">Staff Login</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/80 sm:hidden">✕</button>
        )}
      </div>

      <div className="flex items-center gap-3 mt-5 px-2">
        <div className="w-9 h-9 rounded-full bg-bamyon-amber text-black font-bold flex items-center justify-center">
          {(userDoc?.name || "S")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-sm">{userDoc?.name}</p>
          <p className="text-white/60 text-xs">{business?.name}</p>
        </div>
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const content = (
            <div
              className={`flex items-center justify-between rounded-full px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-bamyon-amber text-black font-semibold"
                  : item.locked
                  ? "text-white/40"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              <span>{item.label}</span>
              {item.locked && <span aria-hidden>🔒</span>}
            </div>
          );
          return (
            <Link key={item.key} href={item.locked ? "/staff" : item.href} onClick={onClose}>
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/15 pt-3">
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 w-full text-left">
          Logout
        </button>
      </div>
    </div>
  );
}
