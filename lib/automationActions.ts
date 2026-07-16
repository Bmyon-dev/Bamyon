import { doc, runTransaction, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AUTOMATION_ACTIVATION_PRICE } from "@/lib/types";

export async function activateAutomationClientSide(
  businessId: string,
  googleReviewLink: string
): Promise<void> {
  if (!googleReviewLink.trim()) throw new Error("Add your Google Business review link first.");

  const businessRef = doc(db, "businesses", businessId);
  const automationRef = doc(db, "businesses", businessId, "automation", "config");

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(businessRef);
    const biz = snap.data();
    if (!biz) throw new Error("Business not found");
    if ((biz.walletBalance || 0) < AUTOMATION_ACTIVATION_PRICE) {
      throw new Error(
        `You need ₦${AUTOMATION_ACTIVATION_PRICE.toLocaleString()} in your wallet. You have ₦${(biz.walletBalance || 0).toLocaleString()}.`
      );
    }

    tx.update(businessRef, {
      walletBalance: (biz.walletBalance || 0) - AUTOMATION_ACTIVATION_PRICE,
    });
    tx.set(automationRef, {
      active: true,
      googleReviewLink: googleReviewLink.trim(),
      activatedAt: Date.now(),
    });
  });
}

/** Free — editing the link or pausing/resuming doesn't cost anything once activated. */
export async function updateAutomationSettingsClientSide(
  businessId: string,
  patch: { active?: boolean; googleReviewLink?: string }
): Promise<void> {
  const automationRef = doc(db, "businesses", businessId, "automation", "config");
  await setDoc(automationRef, patch, { merge: true });
}
