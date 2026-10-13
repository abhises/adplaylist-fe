"use client";

import { useState } from "react";
import { api, ApiError, type CreditCosts, type PlanId, type ReferralRewards } from "@/lib/api";
import { PLAN_IDS, PLAN_NAMES } from "@/lib/plans";
import {
  setPriceCatalog,
  useCreditCosts,
  useReferralRewards,
  useTrialCredits,
} from "@/lib/usePlanPrices";

// What customers see each cost as, in the order of the pricing page's list.
const COST_ROWS: { key: keyof CreditCosts; label: string; hint: string }[] = [
  { key: "image", label: "Image ad creative", hint: "A new image ad from the request form." },
  { key: "video", label: "Video ad creative", hint: "A new video ad from the request form." },
  {
    key: "imageRevision",
    label: "Image ad creative revision",
    hint: "Changes to a delivered image ad.",
  },
  {
    key: "videoRevision",
    label: "Video ad creative revision",
    hint: "Changes to a delivered video ad.",
  },
  { key: "extraSize", label: "Each different size", hint: "Per size beyond the first on a request." },
  {
    key: "canvaEdit",
    label: "Canva edit request",
    hint: "“Request Canva Edit” on an ad without a Canva copy.",
  },
  {
    key: "similarDesign",
    label: "Similar design request",
    hint: "“Request a similar design” on a live ad.",
  },
];

const REFERRAL_ROWS: { key: keyof ReferralRewards; label: string; hint: string }[] = [
  {
    key: "referrer",
    label: "Referrer · friend on Pro or Agency",
    hint: "To the customer whose link was used.",
  },
  {
    key: "referrerStarter",
    label: "Referrer · friend on Starter",
    hint: "Lower, as Starter is too cheap to carry the full reward.",
  },
  {
    key: "friend",
    label: "Friend's welcome bonus",
    hint: "To the new customer, on top of their first month.",
  },
];

const inputClass =
  "w-20 border border-border bg-surface-2 px-2.5 py-1.5 text-right text-sm text-ink tabular-nums outline-none focus:border-ink/70";

function parseCredits(value: string) {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 10000 ? n : null;
}

// Admin → Pricing: what each kind of request costs in credits, the credits
// each plan's free trial gets, and what a referral earns. Saved separately
// from the plan prices, as these don't touch Stripe.
export default function CreditSettingsEditor() {
  const costs = useCreditCosts();
  const trialCredits = useTrialCredits();
  const referralRewards = useReferralRewards();
  // Edits in progress; a field without one shows the live value.
  const [costDrafts, setCostDrafts] = useState<Partial<Record<keyof CreditCosts, string>>>({});
  const [trialDrafts, setTrialDrafts] = useState<Partial<Record<PlanId, string>>>({});
  const [referralDrafts, setReferralDrafts] = useState<
    Partial<Record<keyof ReferralRewards, string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const costChanges: Partial<CreditCosts> = {};
  const trialChanges: Partial<Record<PlanId, number>> = {};
  const referralChanges: Partial<ReferralRewards> = {};
  let invalid = false;
  for (const { key } of COST_ROWS) {
    const draft = costDrafts[key];
    if (draft === undefined) continue;
    const value = parseCredits(draft);
    if (value === null) invalid = true;
    else if (value !== costs[key]) costChanges[key] = value;
  }
  for (const plan of PLAN_IDS) {
    const draft = trialDrafts[plan];
    if (draft === undefined) continue;
    const value = parseCredits(draft);
    if (value === null) invalid = true;
    else if (value !== trialCredits[plan]) trialChanges[plan] = value;
  }
  for (const { key } of REFERRAL_ROWS) {
    const draft = referralDrafts[key];
    if (draft === undefined) continue;
    const value = parseCredits(draft);
    if (value === null) invalid = true;
    else if (value !== referralRewards[key]) referralChanges[key] = value;
  }
  const count =
    Object.keys(costChanges).length +
    Object.keys(trialChanges).length +
    Object.keys(referralChanges).length;
  const edited =
    Object.keys(costDrafts).length +
      Object.keys(trialDrafts).length +
      Object.keys(referralDrafts).length >
    0;

  function discard() {
    setCostDrafts({});
    setTrialDrafts({});
    setReferralDrafts({});
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      setPriceCatalog(
        await api.updateCreditSettings({
          ...(Object.keys(costChanges).length ? { costs: costChanges } : {}),
          ...(Object.keys(trialChanges).length ? { trialCredits: trialChanges } : {}),
          ...(Object.keys(referralChanges).length ? { referralRewards: referralChanges } : {}),
        })
      );
      setCostDrafts({});
      setTrialDrafts({});
      setReferralDrafts({});
      setNotice(`Saved ${count} change${count === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the credit settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-extrabold text-ink">Credit costs</h2>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">
        How many credits each kind of request costs, the credits a free trial starts with on
        each plan, and the bonus credits a referral earns once the referred customer first pays.
        A change applies to requests made, trials started and referrals rewarded from now on;
        requests already made keep what they were charged. The pricing page&apos;s &ldquo;What you can get
        with your credits&rdquo; list follows these.
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="overflow-x-auto border-2 border-ink/15">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-ink/15">
                <th className="px-4 py-3 font-medium">Request</th>
                <th className="px-4 py-3 font-medium">Credits</th>
              </tr>
            </thead>
            <tbody>
              {COST_ROWS.map(({ key, label, hint }) => {
                const draft = costDrafts[key] ?? String(costs[key]);
                const value = parseCredits(draft);
                const changed = value !== null && value !== costs[key];
                return (
                  <tr key={key} className={`border-b border-ink/10 ${changed ? "bg-brand/5" : ""}`}>
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-ink">{label}</span>
                      <span className="block text-xs text-ink-muted">{hint}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        inputMode="numeric"
                        aria-label={`${label} credits`}
                        value={draft}
                        onChange={(e) => {
                          setNotice(null);
                          setCostDrafts((d) => ({ ...d, [key]: e.target.value }));
                        }}
                        className={`${inputClass} ${value === null ? "border-brand" : ""}`}
                      />
                      {changed && <p className="mt-1 text-xs text-ink-muted">was {costs[key]}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-6 self-start">
          <div className="overflow-x-auto border-2 border-ink/15">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-ink-muted">
                <tr className="border-b border-ink/15">
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Free trial credits</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_IDS.map((plan) => {
                  const draft = trialDrafts[plan] ?? String(trialCredits[plan]);
                  const value = parseCredits(draft);
                  const changed = value !== null && value !== trialCredits[plan];
                  return (
                    <tr key={plan} className={`border-b border-ink/10 ${changed ? "bg-brand/5" : ""}`}>
                      <td className="px-4 py-2.5 font-bold text-ink">{PLAN_NAMES[plan]}</td>
                      <td className="px-4 py-2.5">
                        <input
                          inputMode="numeric"
                          aria-label={`${PLAN_NAMES[plan]} free trial credits`}
                          value={draft}
                          onChange={(e) => {
                            setNotice(null);
                            setTrialDrafts((d) => ({ ...d, [plan]: e.target.value }));
                          }}
                          className={`${inputClass} ${value === null ? "border-brand" : ""}`}
                        />
                        {changed && (
                          <p className="mt-1 text-xs text-ink-muted">was {trialCredits[plan]}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto border-2 border-ink/15">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-ink-muted">
                <tr className="border-b border-ink/15">
                  <th className="px-4 py-3 font-medium">Referral</th>
                  <th className="px-4 py-3 font-medium">Bonus credits</th>
                </tr>
              </thead>
              <tbody>
                {REFERRAL_ROWS.map(({ key, label, hint }) => {
                  const draft = referralDrafts[key] ?? String(referralRewards[key]);
                  const value = parseCredits(draft);
                  const changed = value !== null && value !== referralRewards[key];
                  return (
                    <tr key={key} className={`border-b border-ink/10 ${changed ? "bg-brand/5" : ""}`}>
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-ink">{label}</span>
                        <span className="block text-xs text-ink-muted">{hint}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          inputMode="numeric"
                          aria-label={`${label} bonus credits`}
                          value={draft}
                          onChange={(e) => {
                            setNotice(null);
                            setReferralDrafts((d) => ({ ...d, [key]: e.target.value }));
                          }}
                          className={`${inputClass} ${value === null ? "border-brand" : ""}`}
                        />
                        {changed && (
                          <p className="mt-1 text-xs text-ink-muted">was {referralRewards[key]}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          Whole numbers from 0 to 10,000. 0 makes a request free, or gives no bonus.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink-muted">
            {invalid
              ? "Fix the amounts marked in red to save."
              : (notice ?? (count ? `${count} unsaved change${count === 1 ? "" : "s"}` : "No unsaved changes"))}
          </span>
          {edited && (
            <button
              type="button"
              onClick={discard}
              className="border border-border px-3 py-1.5 text-sm font-bold text-ink hover:bg-surface-2"
            >
              Discard
            </button>
          )}
          <button
            type="button"
            disabled={!count || invalid || saving}
            onClick={save}
            className="bg-brand px-4 py-1.5 text-sm font-bold text-brand-foreground disabled:opacity-30"
          >
            {saving ? "Saving…" : "Save credit costs"}
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-brand">{error}</p>}
    </section>
  );
}
