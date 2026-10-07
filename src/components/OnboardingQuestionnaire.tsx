"use client";

import { useEffect, useState } from "react";
import {
  api,
  ApiError,
  type OnboardingAnswers,
  type OnboardingFields,
  type User,
} from "@/lib/api";

// How long someone browses the library before the questionnaire pops up,
// and how long a "Skip for now" holds it off.
const POPUP_DELAY_MS = 5000;
const SKIP_COOLDOWN_DAYS = 7;
const MAX_COMPETITORS = 5;
export const ONBOARDING_STEPS = 4;

export const EMPTY_ONBOARDING: OnboardingFields = {
  niche: "",
  product: "",
  brand: "",
  website: "",
  libraryType: "meta",
  libraryUrl: "",
  competitors: [],
};

export function onboardingFields(
  answers: OnboardingAnswers | null
): OnboardingFields {
  if (!answers) return { ...EMPTY_ONBOARDING };
  const { niche, product, brand, website, libraryType, libraryUrl, competitors } =
    answers;
  return { niche, product, brand, website, libraryType, libraryUrl, competitors };
}

// Steps 1 and 2 need an answer before moving on; 3 and 4 are optional.
export function onboardingStepValid(step: number, v: OnboardingFields) {
  if (step === 1) return !!(v.niche.trim() && v.product.trim());
  if (step === 2) return !!v.brand.trim();
  return true;
}

// The fields each step owns, so saving a step leaves the others alone.
function stepFields(step: number, v: OnboardingFields): Partial<OnboardingFields> {
  if (step === 1) return { niche: v.niche, product: v.product };
  if (step === 2) return { brand: v.brand, website: v.website };
  if (step === 3) return { libraryType: v.libraryType, libraryUrl: v.libraryUrl };
  return { competitors: v.competitors };
}

const labelClass =
  "text-xs font-medium tracking-[1px] text-ink-muted uppercase";
const inputClass =
  "w-full border border-border bg-surface-2 px-3.5 py-3 text-base text-ink outline-none placeholder:text-ink-muted focus:border-ink/70";

// One question of the questionnaire, shared by the library popup and the
// profile page.
export function OnboardingQuestion({
  step,
  value,
  onChange,
}: {
  step: number;
  value: OnboardingFields;
  onChange: (next: OnboardingFields) => void;
}) {
  const [compDraft, setCompDraft] = useState("");
  const set = (patch: Partial<OnboardingFields>) =>
    onChange({ ...value, ...patch });

  function addCompetitor() {
    const name = compDraft.trim();
    if (!name || value.competitors.length >= MAX_COMPETITORS) return;
    if (!value.competitors.some((c) => c.toLowerCase() === name.toLowerCase()))
      set({ competitors: [...value.competitors, name] });
    setCompDraft("");
  }

  if (step === 1)
    return (
      <div className="flex flex-col gap-3.5">
        <p className="text-lg font-bold text-ink">
          What niche are you in, and what do you sell?
        </p>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Niche</span>
          <input
            value={value.niche}
            onChange={(e) => set({ niche: e.target.value })}
            maxLength={255}
            placeholder="e.g. Pet food, skincare, B2B SaaS"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Product or service</span>
          <textarea
            value={value.product}
            onChange={(e) => set({ product: e.target.value })}
            rows={3}
            maxLength={2000}
            placeholder="e.g. Freeze-dried raw dog food sold on subscription"
            className={`${inputClass} resize-y`}
          />
        </label>
      </div>
    );

  if (step === 2)
    return (
      <div className="flex flex-col gap-3.5">
        <p className="text-lg font-bold text-ink">
          What brand or company are you working on?
        </p>
        <input
          value={value.brand}
          onChange={(e) => set({ brand: e.target.value })}
          maxLength={255}
          placeholder="Brand or company name"
          aria-label="Brand or company name"
          className={inputClass}
        />
        <input
          value={value.website}
          onChange={(e) => set({ website: e.target.value })}
          maxLength={500}
          placeholder="Website (optional)"
          aria-label="Website"
          className={inputClass}
        />
      </div>
    );

  if (step === 3) {
    const meta = value.libraryType === "meta";
    const tab = (on: boolean) =>
      `px-4 py-2 text-sm ${on ? "bg-ink text-surface" : "bg-surface text-ink"}`;
    return (
      <div className="flex flex-col gap-3.5">
        <p className="text-lg font-bold text-ink">
          Where&apos;s your brand&apos;s ad library?
        </p>
        <div className="flex self-start border border-ink" role="group">
          <button
            type="button"
            aria-pressed={meta}
            onClick={() => set({ libraryType: "meta" })}
            className={tab(meta)}
          >
            Meta Ad Library
          </button>
          <button
            type="button"
            aria-pressed={!meta}
            onClick={() => set({ libraryType: "google" })}
            className={tab(!meta)}
          >
            Google Ads Transparency
          </button>
        </div>
        <input
          value={value.libraryUrl}
          onChange={(e) => set({ libraryUrl: e.target.value })}
          maxLength={1000}
          aria-label="Ad library link"
          placeholder={
            meta
              ? "facebook.com/ads/library/?view_all_page_id=…"
              : "adstransparency.google.com/advertiser/…"
          }
          className={inputClass}
        />
        <p className="text-[13px] leading-normal text-ink-muted">
          Paste the link to your brand&apos;s page in the library. Don&apos;t
          run ads yet? Leave it blank.
        </p>
      </div>
    );
  }

  const full = value.competitors.length >= MAX_COMPETITORS;
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-lg font-bold text-ink">Who are your competitors?</p>
      <div className="flex gap-2">
        <input
          value={compDraft}
          onChange={(e) => setCompDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCompetitor();
            }
          }}
          disabled={full}
          maxLength={255}
          aria-label="Competitor"
          placeholder="Brand name or website"
          className={`${inputClass} min-w-0 flex-1 disabled:opacity-50`}
        />
        <button
          type="button"
          onClick={addCompetitor}
          disabled={full}
          className="border border-ink px-[18px] text-[15px] text-ink hover:bg-ink hover:text-surface disabled:opacity-40"
        >
          + Add
        </button>
      </div>
      {value.competitors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.competitors.map((c) => (
            <span
              key={c}
              className="flex items-center gap-2 bg-surface-2 py-1.5 pr-2 pl-3 text-sm text-ink"
            >
              {c}
              <button
                type="button"
                aria-label={`Remove ${c}`}
                onClick={() =>
                  set({ competitors: value.competitors.filter((x) => x !== c) })
                }
                className="px-0.5 text-base leading-none text-ink-muted hover:text-brand"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-[13px] text-ink-muted">
        Add up to {MAX_COMPETITORS}. Press Enter to add.
      </p>
    </div>
  );
}

// Pops up a few seconds into browsing the library for clients who haven't
// answered yet (or skipped more than a week ago). Each step is saved as they
// go, so closing halfway keeps what they've told us.
export default function OnboardingPopup({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [value, setValue] = useState<OnboardingFields>(EMPTY_ONBOARDING);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user.role !== "client") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    api
      .getOnboarding()
      .then(({ answers }) => {
        if (cancelled || answers?.completedAt) return;
        const skipped = answers?.skippedAt
          ? Date.parse(answers.skippedAt)
          : null;
        if (skipped && Date.now() - skipped < SKIP_COOLDOWN_DAYS * 86400000)
          return;
        setValue(onboardingFields(answers));
        timer = setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, POPUP_DELAY_MS);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user.id, user.role]);

  if (!open) return null;

  const done = step > ONBOARDING_STEPS;
  const valid = done || onboardingStepValid(step, value);
  const last = step === ONBOARDING_STEPS;

  async function next() {
    if (done) return setOpen(false);
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveOnboarding({
        ...stepFields(step, value),
        ...(last ? { action: "complete" as const } : {}),
      });
      setStep(step + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
  }

  function skip() {
    setOpen(false);
    // Keep what's typed on this step too, not just the earlier ones.
    api
      .saveOnboarding({ ...stepFields(step, value), action: "skip" })
      .catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="flex max-h-[calc(100vh-32px)] w-full max-w-[560px] flex-col bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
      >
        <div className="h-[3px] bg-surface-2">
          <div
            className="h-[3px] bg-brand transition-[width] duration-300"
            style={{
              width: `${(Math.min(step, ONBOARDING_STEPS) / ONBOARDING_STEPS) * 100}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between px-6 pt-5 sm:px-8">
          <p className="text-xs tracking-[2px] text-ink-muted uppercase">
            {done ? "Done" : `Step ${step} of ${ONBOARDING_STEPS}`}
          </p>
          {!done && (
            <button
              type="button"
              onClick={skip}
              className="p-1 text-sm text-ink-muted hover:text-ink"
            >
              Skip for now
            </button>
          )}
        </div>
        <div className="flex flex-col gap-7 overflow-auto px-6 pt-4 pb-2 sm:px-8">
          {step === 1 && (
            <div className="flex flex-col gap-2">
              <h2
                id="onboarding-title"
                className="text-[28px] font-bold tracking-[-0.5px] text-ink"
              >
                Tell us about your brand
              </h2>
              <p className="text-[15px] leading-normal text-pretty text-ink-muted">
                We&apos;ll use this to surface ads from your niche and track
                what your competitors are running.
              </p>
            </div>
          )}
          {done ? (
            <div className="flex flex-col gap-2.5 py-4">
              <h2
                id="onboarding-title"
                className="text-[28px] font-bold tracking-[-0.5px] text-ink"
              >
                You&apos;re all set
              </h2>
              <p className="text-[15px] leading-normal text-ink-muted">
                Thanks! We&apos;ll use this to show you ads that fit{" "}
                {value.brand.trim() || "your brand"}. You can change your
                answers any time on your profile.
              </p>
            </div>
          ) : (
            <>
              {step > 1 && (
                <h2 id="onboarding-title" className="sr-only">
                  Tell us about your brand
                </h2>
              )}
              <OnboardingQuestion step={step} value={value} onChange={setValue} />
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-brand">
              {error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 px-6 pt-5 pb-7 sm:px-8">
          {step > 1 && !done && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="py-3 text-[15px] text-ink hover:underline"
            >
              ← Back
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={next}
            disabled={!valid || saving}
            className="bg-brand px-6 py-[13px] text-base font-bold text-brand-foreground disabled:opacity-40"
          >
            {done
              ? "Go to my feed"
              : saving
                ? "Saving…"
                : last
                  ? "Save & Finish"
                  : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
