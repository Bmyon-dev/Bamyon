import { onSnapshot, Query, DocumentReference, DocumentData, FirestoreError } from "firebase/firestore";

/**
 * Wraps onSnapshot with a standard error path: logs the full error (which,
 * for a missing composite index, contains a direct "click to create it"
 * link from Firestore) to the console, and shows a short toast so the
 * failure is never silent. Use this for every onSnapshot in the app
 * instead of calling onSnapshot directly.
 */
export function listenWithErrorToast<T = DocumentData>(
  ref: Query<T> | DocumentReference<T>,
  onData: (snap: any) => void,
  showError: (text: string) => void,
  label: string
) {
  return onSnapshot(
    ref as any,
    onData,
    (err: FirestoreError) => {
      console.error(`[${label}] Firestore listener error:`, err);
      if (err.code === "failed-precondition") {
        showError(`${label}: a database index is missing — see the browser console for a link to create it.`);
      } else if (err.code === "permission-denied") {
        showError(`${label}: permission denied — check firestore.rules.`);
      } else {
        showError(`${label}: ${err.message}`);
      }
    }
  );
}
