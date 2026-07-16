import { collection, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DESIGN_REQUEST_PRICE } from "@/lib/types";

export async function requestDesignerClientSide(
  businessId: string,
  businessName: string,
  brief: string
): Promise<void> {
  const businessRef = doc(db, "businesses", businessId);
  const requestRef = doc(collection(db, "designRequests"));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(businessRef);
    const biz = snap.data();
    if (!biz) throw new Error("Business not found");
    if ((biz.walletBalance || 0) < DESIGN_REQUEST_PRICE) {
      throw new Error(
        `You need ₦${DESIGN_REQUEST_PRICE.toLocaleString()} in your wallet. You have ₦${(biz.walletBalance || 0).toLocaleString()}.`
      );
    }

    tx.update(businessRef, { walletBalance: (biz.walletBalance || 0) - DESIGN_REQUEST_PRICE });
    tx.set(requestRef, {
      businessId,
      businessName,
      brief: brief.trim(),
      status: "pending",
      requestedAt: Date.now(),
    });
  });
}
