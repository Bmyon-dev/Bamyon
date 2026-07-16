"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { planUnlocks } from "@/lib/permissions";
import { PlanId } from "@/lib/types";

export default function PlanGate({
  minPlan,
  children,
}: {
  minPlan: PlanId;
  children: React.ReactNode;
}) {
  const { business } = useAuth();
  if (planUnlocks(business, minPlan)) return <>{children}</>;

  return (
    <div className="card p-8 text-center mt-10">
      <p className="text-3xl">🔒</p>
      <h2 className="font-display font-bold text-lg mt-2">
        This is a {minPlan} feature
      </h2>
      <p className="text-black/50 text-sm mt-1">
        Upgrade your plan to unlock this page.
      </p>
      <Link href="/dashboard/upgrade" className="btn-primary inline-block mt-4">
        Upgrade Plan
      </Link>
    </div>
  );
}
