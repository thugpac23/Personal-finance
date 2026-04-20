"use client";
export const runtime = 'edge';

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function LoginPage() {
  const { isLoaded, signIn, setActive } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signIn.create({ identifier: email, password });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/dashboard";
      } else if (result.status === "needs_second_factor") {
        setStep("totp");
        setLoading(false);
      } else {
        setError(`Unexpected status: ${result.status}`);
        setLoading(false);
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? "Sign in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signIn.attemptSecondFactor({ strategy: "totp", code: totpCode });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/dashboard";
      } else {
        setError(`Unexpected status: ${result.status}`);
        setLoading(false);
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? "Invalid code. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl">💳</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">SpendWise</h1>
          <p className="mt-1 text-sm text-gray-500">
            {step === "totp" ? "Enter your authenticator code" : "Sign in to your account"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          {step === "credentials" ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password" required value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input" placeholder="••••••••"
                />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading || !isLoaded} className="btn-primary w-full justify-center">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => void handleTotp(e)} className="space-y-4">
              <div>
                <label className="label">Authenticator Code</label>
                <input
                  type="text" required value={totpCode} inputMode="numeric"
                  onChange={e => setTotpCode(e.target.value)}
                  className="input" placeholder="000000" maxLength={6}
                  autoFocus
                />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? "Verifying…" : "Verify"}
              </button>
              <button type="button" onClick={() => setStep("credentials")}
                className="w-full text-center text-sm text-gray-500 hover:underline">
                Back
              </button>
            </form>
          )}

          {step === "credentials" && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <Link href="/auth/reset-password" className="text-blue-600 hover:underline">
                Forgot password?
              </Link>
              <Link href="/auth/register" className="text-blue-600 hover:underline">
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
