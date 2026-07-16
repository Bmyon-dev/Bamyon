"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getVisibleNav } from "@/lib/permissions";
import Logo from "@/components/Logo";
import { isPlanActive } from "@/lib/format";
import { PLAN_LABELS } from "@/lib/types";

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { business, userDoc } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const items = getVisibleNav(business, userDoc);
  const activePlan = business && isPlanActive(business.planExpiry) ? business.plan : "free";

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <div className="bg-bamyon-green text-white h-full flex flex-col w-72 px-4 py-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <Logo size="text-xl" />
          <p className="text-white/60 text-xs mt-0.5">Business-in-a-Box</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/80 sm:hidden">✕</button>
        )}
      </div>

      <div className="flex items-center gap-3 mt-5 px-2">
        {business?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logoUrl} alt={business.name} className="w-9 h-9 rounded-full object-cover border border-white/20" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-bamyon-amber text-black font-bold flex items-center justify-center">
            {(business?.name || "B")[0].toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium text-sm">{business?.name || "Bamyon"}</p>
          <span className="text-xs bg-white/15 rounded-full px-2 py-0.5">
            {PLAN_LABELS[activePlan]}
          </span>
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
              {isActive && !item.locked && <span aria-hidden>›</span>}
            </div>
          );
          if (item.locked) {
            return (
              <Link key={item.key} href="/dashboard/upgrade">
                {content}
              </Link>
            );
          }
          return (
            <Link key={item.key} href={item.href} onClick={onClose}>
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/15 pt-3 space-y-1">
        <Link href="/dashboard/wallet" className="flex items-center justify-between px-4 py-2 text-sm">
          <span>Wallet</span>
          <span className="text-bamyon-amber font-semibold">
            ₦{Math.round(business?.walletBalance || 0).toLocaleString()}
          </span>
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 w-full text-left">
          Logout
        </button>
      </div>
    </div>
  );
}
