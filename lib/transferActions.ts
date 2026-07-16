import { collection, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function requestTransferClientSide(params: {
  fromBusinessId: string;
  fromBusinessName: string;
  toEmail: string;
  amount: number;
}): Promise<void> {
  const { fromBusinessId, fromBusinessName, toEmail, amount } = params;
  if (amount <= 0) throw new Error("Enter a valid amount.");
  if (!toEmail.trim()) throw new Error("Enter the recipient's email.");

  const businessRef = doc(db, "businesses", fromBusinessId);
  const transferRef = doc(collection(db, "transfers"));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(businessRef);
    const biz = snap.data();
    if (!biz) throw new Error("Business not found");
    if ((biz.walletBalance || 0) < amount) {
      throw new Error(`You only have ₦${(biz.walletBalance || 0).toLocaleString()} available.`);
    }

    tx.update(businessRef, { walletBalance: (biz.walletBalance || 0) - amount });
    tx.set(transferRef, {
      fromBusinessId,
      fromBusinessName,
      toEmail: toEmail.trim().toLowerCase(),
      amount,
      status: "pending",
      requestedAt: Date.now(),
    });
  });
}
