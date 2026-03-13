"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isDemo: false,
  signOut: async () => {},
  getToken: async () => "",
  enterDemoMode: () => {},
  exitDemoMode: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    if (isDemo) {
      setIsDemo(false);
      return;
    }
    await firebaseSignOut(auth);
  };

  const getToken = async () => {
    if (isDemo) return "";
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  };

  const enterDemoMode = () => setIsDemo(true);
  const exitDemoMode = () => setIsDemo(false);

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, signOut, getToken, enterDemoMode, exitDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
