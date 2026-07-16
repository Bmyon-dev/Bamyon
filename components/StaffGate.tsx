"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { planUnlocks } from "@/lib/permissions";
import { PermissionKey, PlanId } from "@/lib/types";

export default function StaffGate({
  permission,
  minPlan,
  children,
}: {
  permission: PermissionKey;
  minPlan?: PlanId;
  children: React.ReactNode;
}) {
  const { business, userDoc } = useAuth();
  const hasPermission = userDoc?.permissions?.[permission] === true;
  const unlocked = planUnlocks(business, minPlan);

  if (!hasPermission) {
    return (
      <div className="card p-8 text-center mt-10">
        <p className="text-3xl">🔒</p>
        <h2 className="font-display font-bold text-lg mt-2">You don't have access to this page</h2>
        <p className="text-black/50 text-sm mt-1">Ask your business owner to grant you access.</p>
        <Link href="/staff" className="btn-primary inline-block mt-4">Back to dashboard</Link>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="card p-8 text-center mt-10">
        <p className="text-3xl">🔒</p>
        <h2 className="font-display font-bold text-lg mt-2">This feature isn't on the current plan</h2>
        <p className="text-black/50 text-sm mt-1">Ask your business owner to upgrade the plan.</p>
        <Link href="/staff" className="btn-primary inline-block mt-4">Back to dashboard</Link>
      </div>
    );
  }

  return <>{children}</>;
}
