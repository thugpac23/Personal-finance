"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function ResetPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email });
      setStep("reset");
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? "Password reset failed.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl">🔐</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="mt-1 text-sm text-gray-500">
            {step === "email" ? "We'll email you a reset code" : `Code sent to ${email}`}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          {step === "email" ? (
            <form onSubmit={(e) => void handleSendCode(e)} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="you@example.com" />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading || !isLoaded} className="btn-primary w-full justify-center">
                {loading ? "Sending…" : "Send reset code"}
              </button>
              <div className="text-center">
                <Link href="/auth/login" className="text-sm text-blue-600 hover:underline">
                  Back to sign in
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => void handleReset(e)} className="space-y-4">
              <div>
                <label className="label">Reset Code</label>
                <input type="text" required value={code} inputMode="numeric"
                  onChange={e => setCode(e.target.value)}
                  className="input" placeholder="123456" />
              </div>
              <div>
                <label className="label">New Password</label>
                <input type="password" required minLength={8} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input" placeholder="Min. 8 characters" />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
