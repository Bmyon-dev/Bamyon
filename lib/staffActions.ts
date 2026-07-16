import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db, firebaseConfig } from "@/lib/firebase";
import { NO_PERMISSIONS, PERMISSION_KEYS, Permissions } from "@/lib/types";

const STAFF_LIMITS: Record<string, number> = {
  free: 0,
  standard: 1,
  premium: 999,
  premium_pro: 999,
  enterprise: 999999,
};

/**
 * Creates a Firebase Auth user for a staff account without disturbing the
 * owner's own signed-in session. Normally creating a user with the client
 * SDK immediately signs in as that user — the fix is to do it on a
 * short-lived *second* Firebase app instance, then throw that instance
 * away. The owner's real session (on the default app) never moves.
 */
export async function createStaffAccountClientSide(params: {
  ownerBusinessId: string;
  activePlan: string;
  name: string;
  email: string;
  password: string;
  permissions: Permissions;
}): Promise<string> {
  const { ownerBusinessId, activePlan, name, email, password, permissions } = params;

  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const staffSnap = await getDocs(collection(db, "businesses", ownerBusinessId, "staff"));
  const limit = STAFF_LIMITS[activePlan] ?? 0;
  if (staffSnap.size >= limit) {
    throw new Error(`Your ${activePlan} plan allows ${limit} staff account(s). Upgrade to add more.`);
  }

  const appName = "StaffCreation";
  const secondaryApp = getApps().find((a) => a.name === appName) || initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  let newUid: string;
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    newUid = cred.user.uid;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
  }

  const cleanPermissions = { ...NO_PERMISSIONS };
  for (const key of PERMISSION_KEYS) {
    cleanPermissions[key] = Boolean(permissions?.[key]);
  }

  // These writes run on the primary (owner-authenticated) Firestore client.
  await setDoc(doc(db, "users", newUid), {
    uid: newUid,
    role: "staff",
    businessId: ownerBusinessId,
    email,
    name,
    permissions: cleanPermissions,
    createdAt: Date.now(),
  });

  await setDoc(doc(db, "businesses", ownerBusinessId, "staff", newUid), {
    name,
    email,
    permissions: cleanPermissions,
    createdAt: Date.now(),
  });

  return newUid;
}
