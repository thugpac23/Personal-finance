"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function RegisterPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const [firstName, ...rest] = name.trim().split(" ");
      await signUp.create({
        emailAddress: email,
        password,
        firstName: firstName ?? "",
        lastName: rest.join(" ") || undefined,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(clerkErr.errors?.[0]?.message ?? "Verification failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl">💳</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            {verifying ? "Verify your email" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {verifying ? `Code sent to ${email}` : "Start tracking your finances"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          {verifying ? (
            <form onSubmit={(e) => void handleVerify(e)} className="space-y-4">
              <div>
                <label className="label">Verification Code</label>
                <input
                  type="text" required value={code} inputMode="numeric"
                  onChange={e => setCode(e.target.value)}
                  className="input" placeholder="123456"
                />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? "Verifying…" : "Verify email"}
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="input" placeholder="Мартин" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="you@example.com" />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" required minLength={8} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input" placeholder="Min. 8 characters" />
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading || !isLoaded} className="btn-primary w-full justify-center">
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          {!verifying && (
            <p className="mt-4 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-600 hover:underline">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
