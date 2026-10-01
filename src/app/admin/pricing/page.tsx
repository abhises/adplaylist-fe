"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { api, ApiError, type PlanId } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";
import { PLAN_IDS, PLAN_NAMES, fmtUsd, volumesOf, type PriceList } from "@/lib/plans";
import { setPlanPrices, usePlanPrices } from "@/lib/usePlanPrices";

const inputClass =
  "w-28 border border-border bg-surface-2 px-2.5 py-1.5 text-right text-sm text-ink tabular-nums outline-none focus:border-ink/70";

type Draft = { monthly: string; yearly: string };
type Pending = { plan: PlanId; volume: number; monthly: number; yearly: number };

const key = (plan: PlanId, volume: number) => `${plan}:${volume}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

function parseDollars(value: string) {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) && n >= 0.5 && n <= 100000 && round2(n) === n
    ? n
    : null;
}

export default function AdminPricingPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const prices = usePlanPrices();
  // Edits in progress, by plan + volume; a row without one shows the live price.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!ready || !user) return null;

  function draftOf(list: PriceList, plan: PlanId, volume: number): Draft {
    const live = list[plan][volume];
    return drafts[key(plan, volume)] ?? { monthly: String(live.monthly), yearly: String(live.yearly) };
  }

  function edit(plan: PlanId, volume: number, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [key(plan, volume)]: { ...draftOf(prices, plan, volume), ...patch } }));
  }

  async function save() {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      const { plans } = await api.updatePlanPrice(
        pending.plan,
        pending.volume,
        pending.monthly,
        pending.yearly
      );
      setPlanPrices(plans);
      setDrafts((d) => {
        const next = { ...d };
        delete next[key(pending.plan, pending.volume)];
        return next;
      });
      setNotice(
        `${PLAN_NAMES[pending.plan]}${pending.volume ? ` ${pending.volume}` : ""} is now ${fmtUsd(pending.monthly)}/month and ${fmtUsd(pending.yearly)}/year.`
      );
      setPending(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the price.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-10">
        <h1 className="text-3xl font-extrabold text-ink">Pricing</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Set what each plan costs, in USD excluding tax. A change applies straight away to
          the pricing page, new sign-ups and plan changes. Customers already subscribed keep
          the price they signed up at.
        </p>

        {notice && <p className="mt-6 border border-ink/15 px-4 py-3 text-sm text-ink">{notice}</p>}
        {error && !pending && <p className="mt-6 text-sm text-brand">{error}</p>}

        <div className="mt-6 overflow-x-auto border-2 border-ink/15">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-ink/15">
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Credits / month</th>
                <th className="px-4 py-3 font-medium">Monthly ($)</th>
                <th className="px-4 py-3 font-medium">Yearly ($)</th>
                <th className="px-4 py-3 font-medium">Yearly saving</th>
                <th className="px-4 py-3 font-medium">Per credit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {PLAN_IDS.flatMap((plan) =>
                volumesOf(prices, plan).map((volume) => {
                  const draft = draftOf(prices, plan, volume);
                  const monthly = parseDollars(draft.monthly);
                  const yearly = parseDollars(draft.yearly);
                  const live = prices[plan][volume];
                  const changed =
                    monthly !== null &&
                    yearly !== null &&
                    (monthly !== live.monthly || yearly !== live.yearly);
                  const saving =
                    monthly !== null && yearly !== null
                      ? 1 - yearly / (monthly * 12)
                      : null;
                  return (
                    <tr key={key(plan, volume)} className="border-b border-ink/10">
                      <td className="px-4 py-2.5 font-bold text-ink">{PLAN_NAMES[plan]}</td>
                      <td className="px-4 py-2.5 text-ink">{volume || "Library only"}</td>
                      <td className="px-4 py-2.5">
                        <input
                          inputMode="decimal"
                          aria-label={`${PLAN_NAMES[plan]} ${volume} monthly price`}
                          value={draft.monthly}
                          onChange={(e) => edit(plan, volume, { monthly: e.target.value })}
                          className={`${inputClass} ${monthly === null ? "border-brand" : ""}`}
                        />
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
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted tabular-nums">
                        {saving === null ? "—" : `${Math.round(saving * 100)}%`}
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted tabular-nums">
                        {volume && monthly !== null ? fmtUsd(round2(monthly / volume)) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          disabled={!changed}
                          onClick={() => {
                            setError(null);
                            setNotice(null);
                            setPending({ plan, volume, monthly: monthly!, yearly: yearly! });
                          }}
                          className="bg-brand px-3 py-1.5 text-xs font-bold text-brand-foreground disabled:opacity-30"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Prices must be between $0.50 and $100,000 with at most two decimals. Plans and credit
          volumes themselves are fixed.
        </p>

        <ConfirmDialog
          open={!!pending}
          title="Change this price?"
          message={
            pending && (
              <>
                <p>
                  <span className="font-bold text-ink">
                    {PLAN_NAMES[pending.plan]}
                    {pending.volume ? ` ${pending.volume} credits` : ""}
                  </span>{" "}
                  will cost {fmtUsd(pending.monthly)}/month or {fmtUsd(pending.yearly)}/year
                  (was {fmtUsd(prices[pending.plan][pending.volume].monthly)} /{" "}
                  {fmtUsd(prices[pending.plan][pending.volume].yearly)}).
                </p>
                <p className="mt-2">
                  It applies now to the pricing page, new subscriptions and plan changes.
                  Existing subscribers keep their current price.
                </p>
                {error && <p className="mt-2 text-brand">{error}</p>}
              </>
            )
          }
          confirmLabel={saving ? "Saving…" : "Change price"}
          loading={saving}
          onConfirm={save}
          onCancel={() => {
            setPending(null);
            setError(null);
          }}
        />
      </main>
    </div>
  );
}
