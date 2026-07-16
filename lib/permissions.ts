import { BusinessDoc, PermissionKey, PlanId, UserDoc } from "@/lib/types";
import { isPlanActive } from "@/lib/format";

export interface NavItem {
  key: PermissionKey | "dashboard" | "wallet" | "settings" | "staff" | "care" | "networth" | "design" | "withdraw" | "automation" | "history" | "transfer" | "ads" | "referral" | "website";
  label: string;
  href: string;
  minPlan?: PlanId; // plan tier required to unlock (undefined = always unlocked)
  ownerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "sales", label: "Log Sales", href: "/dashboard/sales" },
  { key: "purchases", label: "Log Purchases", href: "/dashboard/purchases", minPlan: "standard" },
  { key: "inventory", label: "Inventory", href: "/dashboard/inventory", minPlan: "standard" },
  { key: "debtors", label: "Debtors", href: "/dashboard/debtors", minPlan: "standard" },
  { key: "staff", label: "Staff", href: "/dashboard/staff", minPlan: "standard", ownerOnly: true },
  { key: "receipts", label: "Generate Receipt", href: "/dashboard/receipts", minPlan: "standard" },
  { key: "invoices", label: "Generate Invoice", href: "/dashboard/invoices", minPlan: "standard" },
  { key: "catalogue", label: "Catalogue", href: "/dashboard/catalogue", minPlan: "standard" },
  { key: "crm", label: "Customers / CRM", href: "/dashboard/crm", minPlan: "premium" },
  { key: "orders", label: "Orders", href: "/dashboard/orders", minPlan: "premium" },
  { key: "reviews", label: "Reviews", href: "/dashboard/reviews", minPlan: "premium" },
  { key: "analytics", label: "Analytics", href: "/dashboard/analytics", minPlan: "premium" },
  { key: "networth", label: "Net Worth", href: "/dashboard/networth", minPlan: "premium", ownerOnly: true },
  { key: "history", label: "Daily Closings", href: "/dashboard/history", ownerOnly: true },
  { key: "transfer", label: "Transfer Money", href: "/dashboard/transfer", ownerOnly: true },
  { key: "automation", label: "Review Automation", href: "/dashboard/automation", ownerOnly: true },
  { key: "ads", label: "Run Ads", href: "/dashboard/ads", minPlan: "premium", ownerOnly: true },
  { key: "design", label: "Hire a Designer", href: "/dashboard/design", ownerOnly: true },
  { key: "website", label: "Build a Website", href: "/dashboard/website", ownerOnly: true },
  { key: "referral", label: "Referrals", href: "/dashboard/referral", ownerOnly: true },
  { key: "care", label: "Customer Care", href: "/dashboard/support" },
  { key: "wallet", label: "Wallet", href: "/dashboard/wallet", ownerOnly: true },
  { key: "withdraw", label: "Withdraw", href: "/dashboard/withdraw", ownerOnly: true },
  { key: "settings", label: "Settings", href: "/dashboard/settings" },
];

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  standard: 1,
  premium: 2,
  premium_pro: 3,
  enterprise: 4,
};

export function activePlanOf(business: BusinessDoc | null): PlanId {
  if (!business) return "free";
  return isPlanActive(business.planExpiry) ? business.plan : "free";
}

export function planUnlocks(business: BusinessDoc | null, minPlan?: PlanId): boolean {
  if (!minPlan) return true;
  return PLAN_RANK[activePlanOf(business)] >= PLAN_RANK[minPlan];
}

/**
 * Returns the nav items visible to the current user, each flagged with
 * whether it's plan-locked (owner needs to upgrade) — staff never see
 * items their permissions don't include, locked or not.
 */
export function getVisibleNav(
  business: BusinessDoc | null,
  userDoc: UserDoc | null
): Array<NavItem & { locked: boolean }> {
  if (!userDoc) return [];
  const isOwner = userDoc.role === "owner";

  return NAV_ITEMS.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (!isOwner && userDoc.permissions) {
      const alwaysVisible = ["dashboard", "settings", "care"];
      if (!alwaysVisible.includes(item.key)) {
        const permKey = item.key as PermissionKey;
        if (userDoc.permissions[permKey] !== true) return false;
      }
    }
    return true;
  }).map((item) => ({
    ...item,
    locked: !planUnlocks(business, item.minPlan),
  }));
}

/**
 * Same as getVisibleNav, but scoped to the staff dashboard: never includes
 * owner-only items (wallet, staff management, net worth, hire-a-designer,
 * upgrade), regardless of what's passed in.
 */
export function getStaffNav(
  business: BusinessDoc | null,
  userDoc: UserDoc | null
): Array<NavItem & { locked: boolean }> {
  return getVisibleNav(business, userDoc).filter((item) => !item.ownerOnly);
}
