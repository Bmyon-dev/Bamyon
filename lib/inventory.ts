import { doc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function slugifyItemName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

/** Called when a purchase is logged: stock goes up, unit cost is refreshed. */
export async function increaseInventory(businessId: string, name: string, qty: number, unitCost: number) {
  const id = slugifyItemName(name);
  await setDoc(
    doc(db, "businesses", businessId, "inventory", id),
    {
      name: name.trim(),
      quantity: increment(qty),
      unitCost,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/** Called when a sale is logged: stock goes down for any matching item name. */
export async function decreaseInventory(businessId: string, name: string, qty: number) {
  const id = slugifyItemName(name);
  await setDoc(
    doc(db, "businesses", businessId, "inventory", id),
    {
      name: name.trim(),
      quantity: increment(-qty),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
