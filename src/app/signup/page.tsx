"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "@/components/Link";
import { useRouter, useSearchParams } from "next/navigation";
import { libraryPath, signedInMessage, useAuth } from "@/lib/AuthProvider";
import { ApiError } from "@/lib/api";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useToast } from "@/lib/ToastProvider";
import { useI18n } from "@/lib/I18nProvider";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  // The landing page's hero form sends visitors here with ?email= prefilled.
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  // Next stop is the billing page, to add a card and start the free trial,
  // with any plan picked on the pricing section (?plan=&volume=&cycle=)
  // already selected.
  const plan = searchParams.get("plan");
  const next = plan
    ? `/billing?${new URLSearchParams({
        plan,
        volume: searchParams.get("volume") ?? "",
        cycle: searchParams.get("cycle") ?? "monthly",
      })}`
    : "/billing";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t.auth.signup.mismatch);
      return;
    }
    if (password.length < 8) {
      setError(t.auth.signup.tooShort);
      return;
    }

    setSubmitting(true);
    try {
      await register(fullName, email, password, "client");
      toast.success(t.auth.signup.welcome);
      router.push(next);
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
      toast.success(signedInMessage(user, t.common.googleWelcome));
      // A returning customer goes where their account needs them (billing).
      router.push(user.welcomeBack ? libraryPath(user) : next);
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
            {t.common.signUp}
          </div>
          <h2 className="mt-1 text-[32px] font-extrabold text-ink">
            {t.auth.signup.title}
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
            <label
              htmlFor="fullName"
              className="mb-[5px] block text-xs text-ink/70"
            >
              {t.auth.signup.fullName}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="Nina Vogel"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
            />
          </div>

          <div className="mt-4">
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
            />
            <p className="mt-1 text-xs text-ink-muted">{t.auth.signup.passwordHint}</p>
          </div>

          <div className="mt-4">
            <label
              htmlFor="confirmPassword"
              className="mb-[5px] block text-xs text-ink/70"
            >
              {t.auth.signup.confirm}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
            />
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
            {submitting ? t.auth.signup.submitting : t.auth.signup.submit}
          </button>

          <p className="mt-4 text-center text-sm text-ink-muted">
            {t.auth.signup.haveAccount}{" "}
            <Link href="/login" className="font-medium text-brand">
              {t.common.signIn}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
