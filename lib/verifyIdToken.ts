import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

/**
 * Verifies a Firebase Authentication ID token using Google's public signing
 * keys. This is signature + claim verification only — it grants no
 * elevated access, unlike the Admin SDK. It just proves "this really is a
 * token Firebase issued for this uid, and it hasn't expired."
 */
export async function verifyFirebaseIdToken(idToken: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set");

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  return { uid: payload.sub as string, email: payload.email as string | undefined };
}
