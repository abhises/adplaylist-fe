"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { ApiError } from "@/lib/api";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("anna.smith@atlasmedia.co");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/library");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setError(null);
    try {
      await loginWithGoogle(credential);
      router.push("/library");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-between bg-brand px-10 py-12">
        <Link
          href="/"
          className="text-[15px] font-extrabold tracking-[2.1px] text-brand-foreground uppercase"
        >
          Adplaylist
        </Link>

        <div className="max-w-md">
          <h1 className="text-[56px] leading-[0.98] font-extrabold text-brand-foreground">
            Your next ad is here.
          </h1>
          <div className="mt-6 h-px w-full bg-brand-foreground/30" />
          <p className="mt-6 text-base text-brand-foreground">
            Browse the creatives in adplaylist, then open any one as an
            editable copy.
          </p>
        </div>

        <div />
      </div>

      <div className="flex items-center justify-center bg-surface px-10 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-[400px]">
          <div className="text-[12px] font-normal tracking-[1.44px] text-ink-muted uppercase">
            Sign in
          </div>
          <h2 className="mt-1 text-[32px] font-extrabold text-ink">
            Get to your ads
          </h2>

          <div className="mt-6">
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              onError={setError}
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-ink-muted uppercase">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-6">
            <label htmlFor="email" className="mb-[5px] block text-xs text-ink/70">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="nina@atlasmedia.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
            />
          </div>

          <div className="mt-4">
            <label htmlFor="password" className="mb-[5px] block text-xs text-ink/70">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              Keep me signed in
            </label>
            <a href="#" className="text-[13px] text-brand">
              Reset password
            </a>
          </div>

          {error && (
            <p className="mt-4 text-sm text-brand" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full bg-brand py-2 text-sm font-extrabold text-brand-foreground disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-sm text-ink-muted">
            Don&rsquo;t have an account?{" "}
            <Link href="/signup" className="font-medium text-brand">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
