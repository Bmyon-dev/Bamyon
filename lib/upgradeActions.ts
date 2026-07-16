import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BillingCycle, CYCLE_DAYS, PLAN_PRICES, PaidPlanId } from "@/lib/types";

/**
 * Runs entirely from the browser, authenticated as the owner. Firestore
 * Security Rules are what actually keep this honest — they only allow the
 * wallet balance to decrease by one of the exact known plan prices, never
 * increase, and never go negative. See firestore.rules for the enforced
 * logic; this function just performs the write the rules expect.
 */
export async function upgradePlanClientSide(
  businessId: string,
  plan: PaidPlanId,
  cycle: BillingCycle
): Promise<number> {
  const cost = PLAN_PRICES[plan][cycle];
  const businessRef = doc(db, "businesses", businessId);

  const newExpiry = await runTransaction(db, async (tx) => {
    const snap = await tx.get(businessRef);
    const biz = snap.data();
    if (!biz) throw new Error("Business not found");
    if ((biz.walletBalance || 0) < cost) {
      throw new Error(
        `You need ₦${cost.toLocaleString()} but your wallet has ₦${(biz.walletBalance || 0).toLocaleString()}.`
      );
    }

    const base = biz.planExpiry && biz.planExpiry > Date.now() ? biz.planExpiry : Date.now();
    const expiry = base + CYCLE_DAYS[cycle] * 24 * 60 * 60 * 1000;

    tx.update(businessRef, {
      walletBalance: (biz.walletBalance || 0) - cost,
      plan,
      planExpiry: expiry,
    });

    return expiry;
  });

  return newExpiry;
}
