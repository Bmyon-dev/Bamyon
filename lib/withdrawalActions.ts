import { collection, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function requestWithdrawalClientSide(params: {
  businessId: string;
  businessName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}): Promise<void> {
  const { businessId, businessName, amount, bankName, accountNumber, accountName } = params;
  if (amount <= 0) throw new Error("Enter a valid amount.");

  const businessRef = doc(db, "businesses", businessId);
  const withdrawalRef = doc(collection(db, "withdrawals"));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(businessRef);
    const biz = snap.data();
    if (!biz) throw new Error("Business not found");
    if ((biz.walletBalance || 0) < amount) {
      throw new Error(
        `You only have ₦${(biz.walletBalance || 0).toLocaleString()} available.`
      );
    }

    // Hold the funds immediately — the balance is reserved the moment a
    // withdrawal is requested, so it can't also be spent on an upgrade
    // while the payout is pending.
    tx.update(businessRef, { walletBalance: (biz.walletBalance || 0) - amount });
    tx.set(withdrawalRef, {
      businessId,
      businessName,
      amount,
      bankName,
      accountNumber,
      accountName,
      status: "pending",
      requestedAt: Date.now(),
    });
  });
}
