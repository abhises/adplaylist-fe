"use client";

import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { api, ApiError, type PlanId, type PlanPriceChange } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";
import { PLAN_IDS, PLAN_NAMES, fmtUsd, volumesOf, type PriceList } from "@/lib/plans";
import { setPlanPrices, usePlanPrices } from "@/lib/usePlanPrices";

const inputClass =
  "w-28 border border-border bg-surface-2 px-2.5 py-1.5 text-right text-sm text-ink tabular-nums outline-none focus:border-ink/70";

type Draft = { monthly: string; yearly: string; credits: string };
type Change = { plan: PlanId; volume: number; monthly: number; yearly: number; credits: number };

const key = (plan: PlanId, volume: number) => `${plan}:${volume}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
// Tiers are named by their fixed volume ("Pro 10"); their credits a month
// can differ once edited.
const tierName = (plan: PlanId, volume: number) =>
  `${PLAN_NAMES[plan]}${volume ? ` ${volume}` : ""}`;

function parseDollars(value: string) {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) && n >= 0.5 && n <= 100000 && round2(n) === n
    ? n
    : null;
}

function parseCredits(value: string) {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 10000 ? n : null;
}

// Full timestamp, to the second, in the admin's time zone.
function fmtTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// "$49 → $50", or just "$50" when it didn't change.
function fromTo<T>(old: T | null, now: T, fmt: (v: T) => string) {
  return old !== null && old !== now ? (
    <>
      <span className="text-ink-muted">{fmt(old)} → </span>
      <span className="font-bold">{fmt(now)}</span>
    </>
  ) : (
    fmt(now)
  );
}

export default function AdminPricingPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const prices = usePlanPrices();
  // Edits in progress, by plan + volume; a row without one shows the live price.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<PlanPriceChange[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(() => {
    api
      .getPlanPriceHistory()
      .then(({ history }) => {
        setHistory(history);
        setHistoryError(null);
      })
      .catch(() => setHistoryError("Couldn't load the price history."));
  }, []);

  useEffect(() => {
    if (ready && user) loadHistory();
  }, [ready, user, loadHistory]);

  if (!ready || !user) return null;

  function draftOf(list: PriceList, plan: PlanId, volume: number): Draft {
    const live = list[plan][volume];
    return (
      drafts[key(plan, volume)] ?? {
        monthly: String(live.monthly),
        yearly: String(live.yearly),
        credits: String(live.credits),
      }
    );
  }

  function edit(plan: PlanId, volume: number, patch: Partial<Draft>) {
    setNotice(null);
    setDrafts((d) => ({ ...d, [key(plan, volume)]: { ...draftOf(prices, plan, volume), ...patch } }));
  }

  // Every row whose valid draft differs from the live price, plus whether any
  // edited row holds an invalid price (which blocks saving).
  const changes: Change[] = [];
  let invalid = false;
  for (const plan of PLAN_IDS) {
    for (const volume of volumesOf(prices, plan)) {
      if (!drafts[key(plan, volume)]) continue;
      const draft = draftOf(prices, plan, volume);
      const monthly = parseDollars(draft.monthly);
      const yearly = parseDollars(draft.yearly);
      const credits = parseCredits(draft.credits);
      if (monthly === null || yearly === null || credits === null) {
        invalid = true;
        continue;
      }
      const live = prices[plan][volume];
      if (monthly !== live.monthly || yearly !== live.yearly || credits !== live.credits) {
        changes.push({ plan, volume, monthly, yearly, credits });
      }
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { plans } = await api.updatePlanPrices(changes);
      setPlanPrices(plans);
      setDrafts({});
      setNotice(`Saved ${changes.length} price change${changes.length === 1 ? "" : "s"}.`);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the prices.");
      // Some may have saved before the failure; show what's live now.
      api.getPlans().then(({ plans }) => setPlanPrices(plans)).catch(() => {});
    } finally {
      setSaving(false);
      loadHistory();
    }
  }

  // When each history row stopped applying: the next newer change for the
  // same plan + volume, or still in effect.
  const endOf = new Map<number, string | null>();
  const newestSeen = new Map<string, string>();
  for (const row of history ?? []) {
    const k = key(row.plan, row.volume);
    endOf.set(row.id, newestSeen.get(k) ?? null);
    newestSeen.set(k, row.changedAt);
  }
  const historyOf = (plan: PlanId, volume: number) =>
    (history ?? []).filter((row) => row.plan === plan && row.volume === volume);

  const saveBar = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-ink-muted">
        {invalid
          ? "Fix the prices marked in red to save."
          : changes.length
            ? `${changes.length} unsaved change${changes.length === 1 ? "" : "s"}`
            : "No unsaved changes"}
      </span>
      {Object.keys(drafts).length > 0 && (
        <button
          type="button"
          onClick={() => {
            setDrafts({});
            setError(null);
          }}
          className="border border-border px-3 py-1.5 text-sm font-bold text-ink hover:bg-surface-2"
        >
          Discard
        </button>
      )}
      <button
        type="button"
        disabled={!changes.length || invalid}
        onClick={() => {
          setError(null);
          setNotice(null);
          setConfirming(true);
        }}
        className="bg-brand px-4 py-1.5 text-sm font-bold text-brand-foreground disabled:opacity-30"
      >
        Save changes
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-10">
        <h1 className="text-3xl font-extrabold text-ink">Pricing</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Set what each plan costs, in USD excluding tax, and how many credits a month each
          tier gives. Edit as many as you like, then save them together. A change applies straight away to the pricing page, new sign-ups
          and plan changes. Customers already subscribed keep the price they signed up at. Every
          change is kept in the price history below.
        </p>

        {notice && <p className="mt-6 border border-ink/15 px-4 py-3 text-sm text-ink">{notice}</p>}
        {error && !confirming && <p className="mt-6 text-sm text-brand">{error}</p>}

        <div className="mt-6 flex justify-end">{saveBar}</div>

        <div className="mt-3 overflow-x-auto border-2 border-ink/15">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-ink/15">
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Credits / month</th>
                <th className="px-4 py-3 font-medium">Monthly ($)</th>
                <th className="px-4 py-3 font-medium">Yearly ($)</th>
                <th className="px-4 py-3 font-medium">Yearly saving</th>
                <th className="px-4 py-3 font-medium">Per credit</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_IDS.flatMap((plan) =>
                volumesOf(prices, plan).map((volume) => {
                  const draft = draftOf(prices, plan, volume);
                  const monthly = parseDollars(draft.monthly);
                  const yearly = parseDollars(draft.yearly);
                  const credits = parseCredits(draft.credits);
                  const live = prices[plan][volume];
                  const monthlyChanged = monthly !== null && monthly !== live.monthly;
                  const yearlyChanged = yearly !== null && yearly !== live.yearly;
                  const creditsChanged = credits !== null && credits !== live.credits;
                  const yearlySaving =
                    monthly !== null && yearly !== null ? 1 - yearly / (monthly * 12) : null;
                  return (
                    <tr
                      key={key(plan, volume)}
                      className={`border-b border-ink/10 ${
                        monthlyChanged || yearlyChanged || creditsChanged ? "bg-brand/5" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 font-bold text-ink">{PLAN_NAMES[plan]}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{volume || "Library only"}</td>
                      <td className="px-4 py-2.5">
                        <input
                          inputMode="numeric"
                          aria-label={`${PLAN_NAMES[plan]} ${volume} credits per month`}
                          value={draft.credits}
                          onChange={(e) => edit(plan, volume, { credits: e.target.value })}
                          className={`w-20 border border-border bg-surface-2 px-2.5 py-1.5 text-right text-sm text-ink tabular-nums outline-none focus:border-ink/70 ${
                            credits === null ? "border-brand" : ""
                          }`}
                        />
                        {creditsChanged && (
                          <p className="mt-1 text-xs text-ink-muted">was {live.credits}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          inputMode="decimal"
                          aria-label={`${PLAN_NAMES[plan]} ${volume} monthly price`}
                          value={draft.monthly}
                          onChange={(e) => edit(plan, volume, { monthly: e.target.value })}
                          className={`${inputClass} ${monthly === null ? "border-brand" : ""}`}
                        />
                        {monthlyChanged && (
                          <p className="mt-1 text-xs text-ink-muted">was {fmtUsd(live.monthly)}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            inputMode="decimal"
                            aria-label={`${PLAN_NAMES[plan]} ${volume} yearly price`}
                            value={draft.yearly}
                            onChange={(e) => edit(plan, volume, { yearly: e.target.value })}
                            className={`${inputClass} ${yearly === null ? "border-brand" : ""}`}
                          />
                          {monthly !== null && (
                            <button
                              type="button"
                              title="Set yearly to 12 months less 20%"
                              onClick={() =>
                                edit(plan, volume, { yearly: String(round2(monthly * 12 * 0.8)) })
                              }
                              className="text-xs whitespace-nowrap text-brand"
                            >
                              −20%
                            </button>
                          )}
                        </div>
                        {yearlyChanged && (
                          <p className="mt-1 text-xs text-ink-muted">was {fmtUsd(live.yearly)}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted tabular-nums">
                        {yearlySaving === null ? "—" : `${Math.round(yearlySaving * 100)}%`}
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted tabular-nums">
                        {credits && monthly !== null ? fmtUsd(round2(monthly / credits)) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs text-ink-muted">
            Prices must be between $0.50 and $100,000 with at most two decimals; credits a whole
            number. &ldquo;Tier&rdquo; is each option&apos;s fixed id: changing its credits changes
            what everyone on it gets from their next refill.
          </p>
          {saveBar}
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold text-ink">Price history</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Every price and credit amount each tier has had, newest first, with when it applied
            from and to.
          </p>

          {historyError && <p className="mt-4 text-sm text-brand">{historyError}</p>}
          {!history && !historyError && <p className="mt-4 text-sm text-ink-muted">Loading…</p>}
          {history &&
            PLAN_IDS.flatMap((plan) =>
              volumesOf(prices, plan).map((volume) => {
                const rows = historyOf(plan, volume);
                return (
                  <div key={key(plan, volume)} className="mt-6">
                    <h3 className="text-base font-extrabold text-ink">
                      {tierName(plan, volume)}
                      <span className="ml-2 text-sm font-normal text-ink-muted">
                        {prices[plan][volume].credits} credits/month ·{" "}
                        {fmtUsd(prices[plan][volume].monthly)}/month ·{" "}
                        {rows.length} change{rows.length === 1 ? "" : "s"}
                      </span>
                    </h3>
                    <div className="mt-2 overflow-x-auto border-2 border-ink/15">
                      <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="text-xs text-ink-muted">
                          <tr className="border-b border-ink/15">
                            <th className="px-4 py-2.5 font-medium">From</th>
                            <th className="px-4 py-2.5 font-medium">Until</th>
                            <th className="px-4 py-2.5 font-medium">Monthly</th>
                            <th className="px-4 py-2.5 font-medium">Yearly</th>
                            <th className="px-4 py-2.5 font-medium">Credits / month</th>
                            <th className="px-4 py-2.5 font-medium">Changed by</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const end = endOf.get(row.id) ?? null;
                            return (
                              <tr key={row.id} className="border-b border-ink/10 align-top">
                                <td className="px-4 py-2.5 whitespace-nowrap text-ink tabular-nums">
                                  {fmtTimestamp(row.changedAt)}
                                  {row.oldMonthly === null && (
                                    <span className="block text-xs text-ink-muted">
                                      Price when history began
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                                  {end ? (
                                    <span className="text-ink-muted">{fmtTimestamp(end)}</span>
                                  ) : (
                                    <span className="font-bold text-ink">Now (current)</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-ink tabular-nums">
                                  {fromTo(row.oldMonthly, row.monthly, fmtUsd)}
                                </td>
                                <td className="px-4 py-2.5 text-ink tabular-nums">
                                  {fromTo(row.oldYearly, row.yearly, fmtUsd)}
                                </td>
                                <td className="px-4 py-2.5 text-ink tabular-nums">
                                  {fromTo(row.oldCredits, row.credits, String)}
                                </td>
                                <td className="px-4 py-2.5 text-ink-muted">{row.changedBy ?? "—"}</td>
                              </tr>
                            );
                          })}
                          {rows.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-4 text-center text-ink-muted">
                                No changes recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
        </section>

        <ConfirmDialog
          open={confirming}
          title={`Save ${changes.length} price change${changes.length === 1 ? "" : "s"}?`}
          message={
            <>
              <ul className="space-y-1.5">
                {changes.map((c) => {
                  const live = prices[c.plan][c.volume];
                  return (
                    <li key={key(c.plan, c.volume)}>
                      <span className="font-bold text-ink">{tierName(c.plan, c.volume)}</span>:{" "}
                      {fmtUsd(live.monthly)} → {fmtUsd(c.monthly)}/month, {fmtUsd(live.yearly)} →{" "}
                      {fmtUsd(c.yearly)}/year
                      {c.credits !== live.credits && `, ${live.credits} → ${c.credits} credits/month`}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3">
                Prices apply now to the pricing page, new subscriptions and plan changes; existing
                subscribers keep their current price. A credits change applies to everyone on that
                tier from their next refill.
              </p>
              {error && <p className="mt-2 text-brand">{error}</p>}
            </>
          }
          confirmLabel={saving ? "Saving…" : "Save changes"}
          loading={saving}
          onConfirm={save}
          onCancel={() => {
            setConfirming(false);
            setError(null);
          }}
        />
      </main>
    </div>
  );
}
