"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, isDemo } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !isDemo) {
      router.replace("/login");
    }
  }, [user, loading, isDemo, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isDemo) return null;

  return <>{children}</>;
}
