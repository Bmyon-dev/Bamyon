import { collection, doc, getDoc, getDocs, query, runTransaction, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function resolveDepositClientSide(
  depositId: string,
  action: "approve" | "reject"
): Promise<void> {
  const depositRef = doc(db, "deposits", depositId);

  await runTransaction(db, async (tx) => {
    const depositSnap = await tx.get(depositRef);
    const deposit = depositSnap.data();
    if (!deposit) throw new Error("Deposit not found");
    if (deposit.status !== "pending") throw new Error("Deposit already resolved");

    tx.update(depositRef, {
      status: action === "approve" ? "approved" : "rejected",
      resolvedAt: Date.now(),
    });

    if (action === "approve") {
      const businessRef = doc(db, "businesses", deposit.businessId);
      const businessSnap = await tx.get(businessRef);
      const business = businessSnap.data();
      if (!business) throw new Error("Business not found");
      tx.update(businessRef, {
        walletBalance: (business.walletBalance || 0) + deposit.amount,
      });
    }
  });
}

export async function resolveWithdrawalClientSide(
  withdrawalId: string,
  action: "approve" | "reject"
): Promise<void> {
  const withdrawalRef = doc(db, "withdrawals", withdrawalId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(withdrawalRef);
    const withdrawal = snap.data();
    if (!withdrawal) throw new Error("Withdrawal request not found");
    if (withdrawal.status !== "pending") throw new Error("Already resolved");

    tx.update(withdrawalRef, {
      status: action === "approve" ? "approved" : "rejected",
      resolvedAt: Date.now(),
    });

    if (action === "reject") {
      // The balance was held at request time — give it back.
      const businessRef = doc(db, "businesses", withdrawal.businessId);
      const businessSnap = await tx.get(businessRef);
      const business = businessSnap.data();
      if (!business) throw new Error("Business not found");
      tx.update(businessRef, {
        walletBalance: (business.walletBalance || 0) + withdrawal.amount,
      });
    }
  });
}

/**
 * Resolves a pending P2P transfer. Finds the recipient business by email
 * (a normal query — admin's own authenticated read, nothing elevated),
 * then credits them in a transaction. If no business is found with that
 * email, the transfer fails and the sender's held balance is refunded.
 */
export async function resolveTransferClientSide(transferId: string): Promise<void> {
  const transferRef = doc(db, "transfers", transferId);

  // Look up the recipient outside the transaction — Firestore transactions
  // only support get() on known document references, not arbitrary queries.
  const transferSnap = await getDoc(transferRef);
  const transfer = transferSnap.data();
  if (!transfer) throw new Error("Transfer not found");
  if (transfer.status !== "pending") throw new Error("Already resolved");

  const recipientQuery = query(collection(db, "businesses"), where("email", "==", transfer.toEmail));
  const recipientSnap = await getDocs(recipientQuery);

  if (recipientSnap.empty) {
    await runTransaction(db, async (tx) => {
      const senderRef = doc(db, "businesses", transfer.fromBusinessId);
      const senderSnap = await tx.get(senderRef);
      const sender = senderSnap.data();
      if (!sender) throw new Error("Sender business not found");
      tx.update(senderRef, { walletBalance: (sender.walletBalance || 0) + transfer.amount });
      tx.update(transferRef, {
        status: "failed",
        failReason: "No business found with that email — refunded.",
        resolvedAt: Date.now(),
      });
    });
    return;
  }

  const recipientRef = doc(db, "businesses", recipientSnap.docs[0].id);
  await runTransaction(db, async (tx) => {
    const recipientSnapTx = await tx.get(recipientRef);
    const recipient = recipientSnapTx.data();
    if (!recipient) throw new Error("Recipient business not found");
    tx.update(recipientRef, { walletBalance: (recipient.walletBalance || 0) + transfer.amount });
    tx.update(transferRef, { status: "completed", resolvedAt: Date.now() });
  });
}
