"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getStaffNav } from "@/lib/permissions";

export default function StaffHome() {
  const { business, userDoc } = useAuth();
  const items = getStaffNav(business, userDoc)
    .filter((i) => i.key !== "dashboard" && i.key !== "settings" && i.key !== "care" && !i.locked)
    .map((i) => ({ ...i, href: i.href.replace("/dashboard", "/staff") }));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Hi, {userDoc?.name?.split(" ")[0]} 👋</h1>
      <p className="text-black/50 mt-1">
        You're working on behalf of <span className="font-medium">{business?.name}</span>.
      </p>

      <h2 className="font-display font-bold mt-8 mb-3">Your pages</h2>
      {items.length === 0 ? (
        <div className="card p-6 text-center text-black/40 text-sm">
          You haven't been given access to any pages yet — ask your business owner.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <Link key={item.key} href={item.href} className="card p-5 hover:border-bamyon-green border border-transparent transition-colors">
              <p className="font-medium">{item.label}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
