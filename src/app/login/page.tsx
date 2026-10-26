"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "inactive") {
      setError("Your account is currently inactive. Please contact your workspace administrator to restore access.");
    } else if (errorParam === "unauthorized") {
      setError("Please sign in to access that page.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push(data.redirectTo || "/admin/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-rose-700 font-medium">{error}</div>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold mb-1"
            style={{ color: "var(--iwms-navy)" }}
          >
            Work Email Address
          </label>
          <div className="relative rounded-lg shadow-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4" style={{ color: "var(--iwms-sky)" }} />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--iwms-white)",
                border: "1px solid var(--iwms-border)",
                color: "var(--iwms-black)",
              }}
              placeholder="Email Address"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold mb-1"
            style={{ color: "var(--iwms-navy)" }}
          >
            Password
          </label>
          <div className="relative rounded-lg shadow-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4" style={{ color: "var(--iwms-sky)" }} />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
              style={{
                background: "var(--iwms-white)",
                border: "1px solid var(--iwms-border)",
                color: "var(--iwms-black)",
              }}
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg shadow-xs text-sm font-semibold iwms-btn-primary transition-all disabled:opacity-60"
          style={{
            background: "var(--iwms-sky)",
            color: "var(--iwms-navy)",
          }}
        >
          {isLoading ? (
            "Signing In..."
          ) : (
            <>
              Sign In to Vyorai <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen iwms-workspace flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8" style={{ background: "var(--iwms-bg)" }}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div
          className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white p-1 shadow-sm border border-slate-200/80 mb-4 overflow-hidden"
        >
          <img
            src="/image.png"
            alt="Vyorai"
            className="w-full h-full object-contain"
          />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--iwms-navy)" }}>
          Vyorai Login
        </h2>
        <p className="mt-2 text-sm" style={{ color: "rgba(11,31,58,0.65)" }}>
          Vyorai Intern Workspace • Secure Role-Based Access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div
          className="iwms-card py-8 px-5 sm:px-10 shadow-sm"
          style={{ background: "var(--iwms-white)", borderRadius: "16px" }}
        >
          <Suspense fallback={<div className="py-8 text-center text-sm text-slate-500">Loading sign in...</div>}>
            <LoginForm />
          </Suspense>

          <div
            className="mt-6 pt-4 text-center"
            style={{ borderTop: "1px solid var(--iwms-border)" }}
          >
            <p className="text-xs" style={{ color: "rgba(11,31,58,0.50)" }}>
              New intern? Use the activation link received in your invitation email to set your password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
