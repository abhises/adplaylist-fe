"use client";

import { useState, type FormEvent } from "react";
import Link from "@/components/Link";
import { useRouter } from "next/navigation";
import { libraryPath, useAuth } from "@/lib/AuthProvider";
import { ApiError } from "@/lib/api";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useToast } from "@/lib/ToastProvider";
import { useI18n } from "@/lib/I18nProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
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
      const user = await login(email, password);
      toast.success(t.auth.login.welcome);
      router.push(libraryPath(user));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t.common.somethingWentWrong
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setError(null);
    try {
      const user = await loginWithGoogle(credential);
      toast.success(t.common.googleWelcomeBack);
      router.push(libraryPath(user));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t.common.somethingWentWrong
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
            {t.auth.sideTitle}
          </h1>
          <div className="mt-6 h-px w-full bg-brand-foreground/30" />
          <p className="mt-6 text-base text-brand-foreground">
            {t.auth.sideLead}
          </p>
        </div>

        <div />
      </div>

      <div className="flex items-center justify-center bg-surface px-10 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-[400px]">
          <div className="text-[12px] font-normal tracking-[1.44px] text-ink-muted uppercase">
            {t.common.signIn}
          </div>
          <h2 className="mt-1 text-[32px] font-extrabold text-ink">
            {t.auth.login.title}
          </h2>

          <div className="mt-6">
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              onError={setError}
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-ink-muted uppercase">{t.common.or}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-6">
            <label htmlFor="email" className="mb-[5px] block text-xs text-ink/70">
              {t.auth.email}
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
              {t.auth.password}
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
              {t.auth.login.keepSignedIn}
            </label>
            <a href="#" className="text-[13px] text-brand" suppressHydrationWarning>
              {t.auth.login.reset}
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
            {submitting ? t.auth.login.submitting : t.common.signIn}
          </button>

          <p className="mt-4 text-center text-sm text-ink-muted">
            {t.auth.login.noAccount}{" "}
            <Link href="/signup" className="font-medium text-brand">
              {t.common.signUp}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
