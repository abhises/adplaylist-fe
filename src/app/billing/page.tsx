"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { CreditHistory, PaymentHistory } from "@/components/BillingHistory";
import StartPlanNow, { canStartPlanNow } from "@/components/StartPlanNow";
import { useAuth, useRequireAuth } from "@/lib/AuthProvider";
import { api, ApiError, type Account, type BillingCycle, type PlanId } from "@/lib/api";
import {
  PLAN_IDS,
  PLAN_NAMES,
  STATUS_LABELS,
  defaultVolume,
  fmtDate,
  fmtUsd,
  isPlanId,
  isValidVolume,
  monthlyPrice,
  volumesOf,
  yearlyTotal,
} from "@/lib/plans";
import { usePlanPrices } from "@/lib/usePlanPrices";

export default function BillingPage() {
  return (
    <Suspense>
      <Billing />
    </Suspense>
  );
}

function Billing() {
  const { user, ready } = useRequireAuth();
  const { refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handledReturn = useRef(false);
  const synced = useRef(false);

  // Coming back from the Stripe portal (or any visit): re-read the plan from
  // Stripe so a change shows even if its webhook hasn't arrived yet.
  useEffect(() => {
    if (!user?.account || synced.current || searchParams.get("checkout")) return;
    synced.current = true;
    api
      .syncBilling()
      .then(() => refresh())
      .catch(() => {});
  }, [user, searchParams, refresh]);

  // Back from Stripe Checkout: apply the new subscription now rather than
  // waiting for the webhook, then drop the query string.
  useEffect(() => {
    if (!user || handledReturn.current) return;
    const checkout = searchParams.get("checkout");
    if (!checkout) return;
    handledReturn.current = true;
    const sessionId = searchParams.get("session_id");
    Promise.resolve()
      .then(async () => {
        if (checkout === "success" && sessionId) {
          await api.completeCheckout(sessionId);
          await refresh();
          setNotice("You're subscribed. Thanks!");
        } else if (checkout === "cancelled") {
          setNotice("Checkout cancelled. Nothing was charged.");
        }
      })
      .catch(() =>
        setNotice("Payment received. Your plan will update in a moment — refresh if it doesn't.")
      )
      .finally(() => router.replace("/billing"));
  }, [user, searchParams, refresh, router]);

  if (!ready || !user) return null;
  const account = user.account;

  async function go(load: () => Promise<{ url: string }>) {
    setError(null);
    setBusy(true);
    try {
      const { url } = await load();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-10">
        <h1 className="text-3xl font-extrabold text-ink">Billing &amp; Credits</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your plan, credits and payment details.
        </p>

        {notice && (
          <p className="mt-6 border border-ink/15 px-4 py-3 text-sm text-ink">{notice}</p>
        )}
        {error && <p className="mt-6 text-sm text-brand">{error}</p>}

        {!account ? (
          <p className="mt-8 text-sm text-ink-muted">
            Adplaylist staff accounts don&apos;t have a plan or billing.
          </p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <PlanCard account={account} />
              <CreditsCard account={account} />
            </div>

            {account.role !== "owner" ? (
              <p className="mt-8 text-sm text-ink-muted">
                Only the account owner can change the plan or payment details.
              </p>
            ) : account.hasSubscription ? (
              <ManageCard account={account} busy={busy} onManage={() => go(api.openBillingPortal)} />
            ) : (
              <PlanChooser
                account={account}
                busy={busy}
                initial={{
                  plan: searchParams.get("plan"),
                  volume: searchParams.get("volume"),
                  cycle: searchParams.get("cycle"),
                }}
                onCheckout={(plan, volume, cycle) =>
                  go(() => api.startCheckout(plan, volume, cycle))
                }
              />
            )}

            {account.role === "owner" && (
              <PaymentHistory version={`${account.status}-${account.plan}-${account.creditVolume}`} />
            )}
            <CreditHistory version={`${account.status}-${account.credits}-${account.creditVolume}`} />
          </>
        )}
      </main>
    </div>
  );
}

function statusLine(account: Account) {
  switch (account.status) {
    case "trial":
      return account.hasSubscription
        ? `You'll be charged only after your free trial ends on ${fmtDate(account.trialEndsAt)}. Cancel before then and you pay nothing.`
        : `Trial ends ${fmtDate(account.trialEndsAt)}. Add a card to keep your plan — you won't be charged until the trial ends.`;
    case "active":
      return `Renews ${fmtDate(account.currentPeriodEnd)}.`;
    case "past_due":
      return `Your last payment failed. Update your card by ${fmtDate(account.graceEndsAt)} to keep access.`;
    case "cancelled":
      return account.cancelledInTrial
        ? `Trial cancelled — you won't be charged. Access ends ${fmtDate(account.currentPeriodEnd)}.`
        : `Cancelled — no further charges. Your plan stays active until ${fmtDate(account.currentPeriodEnd)}.`;
    case "expired":
      return "Your plan has expired. You can still browse the library; subscribe to unlock everything else.";
  }
}

function PlanCard({ account }: { account: Account }) {
  return (
    <div className="border-2 border-ink/15 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">
            {account.planName}
            {account.creditVolume > 0 && ` · ${account.creditVolume} credits/month`}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {account.hasSubscription &&
              (account.billingCycle === "yearly" ? "Billed yearly · " : "Billed monthly · ")}
            {account.maxSeats} {account.maxSeats === 1 ? "seat" : "seats"} ·{" "}
            {account.maxBrands} {account.maxBrands === 1 ? "brand" : "brands"}
            {account.turnaround && ` · ${account.turnaround} turnaround`}
          </p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-bold ${
            account.status === "active" || account.status === "trial"
              ? "bg-ink/10 text-ink"
              : "bg-brand text-brand-foreground"
          }`}
        >
          {STATUS_LABELS[account.status]}
        </span>
      </div>
      <p className="mt-4 text-sm text-ink">{statusLine(account)}</p>
      {canStartPlanNow(account) && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StartPlanNow account={account} />
          <span className="text-xs text-ink-muted">
            Don&apos;t want to wait? Start now to get all {account.creditVolume} credits today.
          </span>
        </div>
      )}
    </div>
  );
}

function CreditsCard({ account }: { account: Account }) {
  return (
    <div className="border-2 border-ink/15 p-6">
      <h2 className="text-xl font-extrabold text-ink">Credits</h2>
      <p className="mt-2 text-3xl font-extrabold text-ink">
        {account.credits}
        {account.creditTotal > 0 && (
          <span className="text-lg font-bold text-ink-muted"> / {account.creditTotal}</span>
        )}
      </p>
      {account.creditTotal > 0 && (
        <>
          <div
            className="mt-2 h-1.5 w-full bg-ink/10"
            role="meter"
            aria-label="Credits left"
            aria-valuemin={0}
            aria-valuemax={account.creditTotal}
            aria-valuenow={account.credits}
          >
            <div
              className="h-full bg-brand"
              style={{ width: `${Math.min(100, (account.credits / account.creditTotal) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            {account.credits} left · {Math.max(0, account.creditTotal - account.credits)} used of{" "}
            {account.creditTotal} {account.status === "trial" ? "trial" : "this month"}
          </p>
        </>
      )}
      <p className="mt-1 text-sm text-ink-muted">
        {account.plan === "starter"
          ? "Starter is library-only. Upgrade to Pro or Agency to request custom ads."
          : account.status === "trial"
            ? account.credits === 0
              ? `You've used all your trial credits. Start your paid plan now to get ${account.creditVolume} credits straight away.`
              : "Trial credits. One credit is one custom ad from the design team."
            : account.status === "expired"
              ? "Subscribe to get credits again."
              : `One credit is one custom ad. Shared by everyone on the account; unused credits don't roll over.${
                  account.nextRefillAt && account.status !== "cancelled"
                    ? ` Refills to ${account.creditVolume} on ${fmtDate(account.nextRefillAt)}.`
                    : ""
                }`}
      </p>
    </div>
  );
}

function ManageCard({
  account,
  busy,
  onManage,
}: {
  account: Account;
  busy: boolean;
  onManage: () => void;
}) {
  const label =
    account.status === "past_due"
      ? "Update payment details"
      : account.status === "cancelled"
        ? "Resubscribe"
        : "Manage billing";
  return (
    <div className="mt-8 border-2 border-ink/15 p-6">
      <h2 className="text-xl font-extrabold text-ink">Manage your plan</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Change plan or credit volume, update your card, cancel or resubscribe,
        and download invoices in the Stripe customer portal. Upgrades apply
        straight away; lowering your plan takes effect at the next billing date.
      </p>
      <button
        onClick={onManage}
        disabled={busy}
        className="mt-4 bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
      >
        {busy ? "Opening…" : label} <span aria-hidden>&#8599;</span>
      </button>
    </div>
  );
}

function PlanChooser({
  account,
  busy,
  initial,
  onCheckout,
}: {
  account: Account;
  busy: boolean;
  initial: { plan: string | null; volume: string | null; cycle: string | null };
  onCheckout: (plan: PlanId, volume: number, cycle: BillingCycle) => void;
}) {
  const prices = usePlanPrices();
  const initialPlan = isPlanId(initial.plan) ? initial.plan : account.plan;
  const initialVolume = Number(initial.volume);
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [volumes, setVolumes] = useState<Record<PlanId, number>>(() => {
    const v = Object.fromEntries(PLAN_IDS.map((p) => [p, defaultVolume(p)])) as Record<PlanId, number>;
    if (isValidVolume(initialPlan, initialVolume)) v[initialPlan] = initialVolume;
    return v;
  });
  const [cycle, setCycle] = useState<BillingCycle>(
    initial.cycle === "yearly" ? "yearly" : "monthly"
  );

  const volume = volumes[plan];
  const keepsTrial = account.status === "trial";

  return (
    <div className="mt-8 border-2 border-ink/15 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink">
            {account.status === "expired" ? "Subscribe" : "Choose your plan"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {keepsTrial
              ? `You'll be charged only after your free trial ends on ${fmtDate(account.trialEndsAt)} — cancel before then and you pay nothing. Your card is needed now to start the trial. Pro and Agency trials include 2 credits.`
              : "You'll be charged today. Prices in USD, excluding tax."}
          </p>
        </div>
        <div className="flex border border-ink/15">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-3 py-1.5 text-sm font-bold ${
                cycle === c ? "bg-brand text-brand-foreground" : "text-ink"
              }`}
            >
              {c === "monthly" ? "Monthly" : "Yearly · save 20%"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLAN_IDS.map((p) => {
          const tiers = volumesOf(prices, p);
          const selected = p === plan;
          return (
            <div
              key={p}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => setPlan(p)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPlan(p)}
              className={`cursor-pointer border p-5 ${
                selected ? "border-2 border-brand" : "border-ink/15"
              }`}
            >
              <p className="text-lg font-extrabold text-ink">{PLAN_NAMES[p]}</p>
              <p className="mt-2 text-2xl font-extrabold text-ink">
                {fmtUsd(monthlyPrice(prices, p, volumes[p], cycle))}
                <span className="text-sm font-normal text-ink-muted">/mo</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {cycle === "yearly"
                  ? `${fmtUsd(yearlyTotal(prices, p, volumes[p]))} billed yearly`
                  : "Billed monthly"}
              </p>
              {tiers.length > 1 ? (
                <select
                  value={volumes[p]}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setVolumes((v) => ({ ...v, [p]: Number(e.target.value) }));
                    setPlan(p);
                  }}
                  className="mt-3 w-full border border-ink/15 bg-transparent px-2 py-1.5 text-sm text-ink"
                >
                  {tiers.map((t) => (
                    <option key={t} value={t}>
                      {t} credits / month
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-3 py-1.5 text-sm text-ink-muted">Library only</p>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onCheckout(plan, volume, cycle)}
        disabled={busy}
        className="mt-6 bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-60"
      >
        {busy
          ? "Opening checkout…"
          : keepsTrial
            ? `Start free trial — ${PLAN_NAMES[plan]}${volume ? ` ${volume}` : ""}`
            : `Continue to payment — ${PLAN_NAMES[plan]}${volume ? ` ${volume}` : ""}`}
      </button>
    </div>
  );
}
