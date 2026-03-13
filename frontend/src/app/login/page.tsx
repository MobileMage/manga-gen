"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  AuthError,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { z } from "zod";

type Tab = "signin" | "signup";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Please enter your password"),
});

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function getFirebaseErrorMessage(error: AuthError): string | null {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists";
    case "auth/invalid-credential":
      return "Invalid email or password";
    case "auth/user-not-found":
      return "No account found with this email";
    case "auth/wrong-password":
      return "Incorrect password";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/invalid-email":
      return "Please enter a valid email address";
    case "auth/popup-closed-by-user":
      return null;
    default:
      return "Something went wrong. Please try again";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const schema = tab === "signin" ? signInSchema : signUpSchema;
    const result = schema.safeParse({ email, password });

    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as "email" | "password";
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (tab === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.replace("/");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const message = getFirebaseErrorMessage(err as AuthError);
        if (message) setError(message);
      } else {
        setError("Something went wrong. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setFieldErrors({});
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace("/");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const message = getFirebaseErrorMessage(err as AuthError);
        if (message) setError(message);
      } else {
        setError("Something went wrong. Please try again");
      }
    }
  };

  return (
    <div className="min-h-screen bg-black screentone flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm fade-up"
        style={{ animationDelay: "0.1s" }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="text-4xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
          >
            <span className="text-red-500">漫</span>
            <span className="text-white">GEN</span>
          </div>
          <p className="text-gray-500 text-sm mt-2">AI Manga Generator</p>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-gray-800">
            {(["signin", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setError("");
                  setFieldErrors({});
                }}
                className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                  tab === t ? "text-white" : "text-gray-500 hover:text-gray-300"
                }`}
                style={{ fontFamily: "var(--font-space-mono), monospace" }}
              >
                {t === "signin" ? "SIGN IN" : "SIGN UP"}
                {tab === t && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
                )}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block"
                style={{ fontFamily: "var(--font-space-mono), monospace" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                className="w-full bg-gray-900 border-2 border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-red-500 transition-colors"
              />
              {fieldErrors.email && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label
                className="text-xs text-gray-400 uppercase tracking-widest mb-1.5 block"
                style={{ fontFamily: "var(--font-space-mono), monospace" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                className="w-full bg-gray-900 border-2 border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-red-500 transition-colors"
              />
              {fieldErrors.password && (
                <p className="text-red-400 text-xs mt-1">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-lg transition-all text-sm tracking-wide"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              {loading
                ? "LOADING..."
                : tab === "signin"
                ? "SIGN IN"
                : "CREATE ACCOUNT"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full py-2.5 border-2 border-gray-700 text-gray-300 rounded-lg text-sm hover:border-gray-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
