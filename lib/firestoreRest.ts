/**
 * Reads a single Firestore document over the REST API, authenticated as
 * the calling user (their ID token, not a service account). Firestore
 * Security Rules apply exactly as if this were a normal client read — if
 * the rules wouldn't let this user read the doc, this fails too.
 */
export async function firestoreGetDoc(
  path: string, // e.g. "businesses/abc123"
  idToken: string
): Promise<Record<string, any> | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore read failed (${res.status})`);

  const data = await res.json();
  return decodeFirestoreFields(data.fields || {});
}

// Firestore's REST API wraps every value in a type envelope, e.g.
// { stringValue: "x" } or { integerValue: "5" } — unwrap it into plain JS.
function decodeFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of Object.keys(fields)) {
    out[key] = decodeValue(fields[key]);
  }
  return out;
}

function decodeValue(value: any): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.mapValue !== undefined) return decodeFirestoreFields(value.mapValue.fields || {});
  if (value.arrayValue !== undefined) return (value.arrayValue.values || []).map(decodeValue);
  return null;
}
