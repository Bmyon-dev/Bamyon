"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function StaffSettingsPage() {
  const { userDoc, business } = useAuth();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">My Account</h1>
      <p className="text-black/50 mt-1">Your staff login details.</p>
      <div className="card p-5 mt-5 space-y-3">
        <div>
          <p className="text-xs text-black/40">Name</p>
          <p className="font-medium">{userDoc?.name}</p>
        </div>
        <div>
          <p className="text-xs text-black/40">Email</p>
          <p className="font-medium">{userDoc?.email}</p>
        </div>
        <div>
          <p className="text-xs text-black/40">Business</p>
          <p className="font-medium">{business?.name}</p>
        </div>
        <Link href="/forgot-password" className="text-bamyon-green text-sm font-medium block">
          Reset my password
        </Link>
      </div>
    </div>
  );
}
