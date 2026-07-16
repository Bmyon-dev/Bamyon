"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { BusinessDoc, UserDoc } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

interface AuthState {
  firebaseUser: User | null;
  userDoc: UserDoc | null;
  business: BusinessDoc | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  userDoc: null,
  business: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [business, setBusiness] = useState<BusinessDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Track Firebase Auth session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (!u) {
        setUserDoc(null);
        setBusiness(null);
        setLoading(false);
      }
    }, (err) => {
      console.error("Auth state error:", err);
      toast.error("Connection issue — please refresh the page.");
      setLoading(false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the users/{uid} doc (role, businessId, permissions) in realtime
  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = onSnapshot(
      doc(db, "users", firebaseUser.uid),
      (snap) => {
        setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null);
        setLoading(false);
      },
      (err) => {
        console.error("users/{uid} listener error:", err);
        toast.error(`Couldn't load your account (${err.code}). Please refresh.`);
        setLoading(false);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  // Load the business doc (plan, wallet, expiry) in realtime
  useEffect(() => {
    if (!userDoc?.businessId) {
      setBusiness(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "businesses", userDoc.businessId),
      (snap) => {
        if (snap.exists()) {
          setBusiness({ id: snap.id, ...snap.data() } as BusinessDoc);
        }
      },
      (err) => {
        console.error("businesses/{id} listener error:", err);
        toast.error(`Couldn't load business data (${err.code}). Please refresh.`);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc?.businessId]);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, userDoc, business, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
