"use client";

import { useState } from "react";
import Link from "@/components/Link";
import type { PlanId } from "@/lib/api";
import { creditsOf, fmtUsd as fmt, monthlyPrice, volumesOf, yearlySaving } from "@/lib/plans";
import { usePlanPrices } from "@/lib/usePlanPrices";
import { useI18n } from "@/lib/I18nProvider";
import type { Dictionary } from "@/lib/dictionaries";

// Plan names are product names and stay in English; each plan's
// description and "Great for" list are in the dictionary under pricing.plans.
type Plan = {
  id: PlanId;
  name: string;
  popular?: boolean;
};

const PLANS: Plan[] = [
  { id: "starter", name: "Starter" },
  { id: "pro", name: "Pro", popular: true },
  { id: "agency", name: "Agency" },
];

// A string per plan is shown as-is; a boolean per plan is a ✓ or —.
// "credits" follows whatever each plan's dropdown is set to, and
// "turnaround" comes from the dictionary. Labels are dictionary keys.
const FEATURES: [keyof Dictionary["pricing"]["features"], "credits" | "turnaround" | string[] | boolean[]][] = [
  ["credits", "credits"],
  ["brands", ["1", "2", "5"]],
  ["seats", ["1", "2", "5"]],
  ["turnaround", "turnaround"],
  ["library", [true, true, true]],
  ["editable", [false, true, true]],
  ["sizes", [true, true, true]],
  ["localisation", [false, true, true]],
  ["brandKit", [false, false, true]],
  ["video", [false, false, true]],
  ["lead", [false, false, true]],
];

// Rows up to here are the headline numbers, set in bold.
const BOLD_ROWS = 4;

const mono = "font-mono text-[12px] tracking-[0.08em]";
const h2 = "text-[clamp(36px,4.5vw,56px)] leading-none font-extrabold tracking-[-0.03em]";
// Below 820px only one plan column shows, picked with the Compare tabs.
const gridCols =
  "grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] min-[820px]:grid-cols-[minmax(200px,1.1fr)_repeat(3,minmax(0,1fr))]";

function Toggle<T extends string | boolean>({
  options,
  value,
  onChange,
  stretch,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  stretch?: boolean;
}) {
  return (
    <div className="flex gap-1 border-[1.5px] border-[#161514] p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`px-4 py-[10px] text-[14px] font-bold whitespace-nowrap ${stretch ? "flex-1 px-2" : ""} ${
              on ? "bg-[#161514] text-white" : "bg-transparent text-[#161514]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function PricingSection({ signedIn }: { signedIn: boolean }) {
  // Admins can change prices, so they come from the API.
  const prices = usePlanPrices();
  const { t: dict } = useI18n();
  const t = dict.pricing;
  const [yearly, setYearly] = useState(false);
  const [credits, setCredits] = useState<Record<PlanId, number>>({
    starter: 0,
    pro: 10,
    agency: 50,
  });
  // The plan shown in the comparison table on phones.
  const [compare, setCompare] = useState(1);

  // Carries the chosen plan through signup to the billing page, which
  // starts checkout for it.
  function ctaHref(plan: PlanId) {
    const q = `plan=${plan}&volume=${credits[plan]}&cycle=${yearly ? "yearly" : "monthly"}`;
    return signedIn ? `/billing?${q}` : `/signup?${q}`;
  }

  return (
    <section id="pricing" className="scroll-mt-[72px] border-t border-[#dcd9d5]">
      <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,32px)] py-[clamp(64px,9vw,100px)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className={`${mono} text-[#EC3016]`}>{t.eyebrow}</div>
            <h2 className={`${h2} mt-[14px] max-w-[720px] text-balance`}>
              {t.title}
            </h2>
            <p className="mt-5 max-w-[600px] text-[18px] leading-[1.55] text-pretty text-[#55524e]">
              {t.lead}
            </p>
          </div>
          <Toggle
            options={[
              { label: t.monthly, value: false },
              { label: t.yearly, value: true },
            ]}
            value={yearly}
            onChange={setYearly}
          />
        </div>

        {/* Plan cards. On desktop they sit over the table's plan columns,
            with an empty cell above its label column. */}
        <div className="mt-[72px] grid grid-cols-1 items-stretch gap-12 min-[820px]:grid-cols-[minmax(200px,1.1fr)_repeat(3,minmax(0,1fr))] min-[820px]:gap-0">
          <div className="hidden min-[820px]:block" />
          {PLANS.map((p) => {
            const c = credits[p.id];
            const monthly = monthlyPrice(prices, p.id, c, "monthly");
            const price = monthlyPrice(prices, p.id, c, yearly ? "yearly" : "monthly");
            const tierKeys = volumesOf(prices, p.id);
            return (
              <div
                key={p.id}
                className={`relative flex flex-col gap-5 bg-white px-6 py-7 min-[820px]:border-b-0 ${
                  p.popular ? "border-2 border-[#EC3016]" : "border border-[#dcd9d5]"
                }`}
              >
                {p.popular && (
                  <div className="absolute right-[-2px] bottom-full left-[-2px] bg-[#EC3016] py-[7px] text-center font-mono text-[11px] tracking-[0.08em] text-white">
                    {t.mostPopular}
                  </div>
                )}
                <div>
                  <h3 className="text-[24px] font-extrabold tracking-[-0.02em]">{p.name}</h3>
                  <p className="mt-2 text-[15px] leading-[1.5] text-pretty text-[#55524e]">{t.plans[p.id].desc}</p>
                </div>
                <div className="flex flex-col gap-[6px]">
                  <span className="text-[13px] font-bold">{t.greatFor}</span>
                  {t.plans[p.id].goodFor.map((g) => (
                    <span key={g} className="text-[15px] text-[#55524e]">
                      ✓ {g}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <span className="text-[13px] font-bold">{t.features.credits}</span>
                  {tierKeys.length > 1 ? (
                    <select
                      value={c}
                      onChange={(e) => setCredits((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                      className="h-12 cursor-pointer rounded-none border-[1.5px] border-[#161514] bg-white px-3 text-[16px] font-semibold text-[#161514]"
                    >
                      {tierKeys.map((k) => (
                        <option key={k} value={k}>
                          {t.adsPerMonth(creditsOf(prices, p.id, k))}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex h-12 items-center border-[1.5px] border-[#161514] px-3 text-[16px] font-semibold">
                      {c ? t.adsPerMonth(creditsOf(prices, p.id, c)) : t.libraryOnly}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-[6px]">
                    <span className="text-[56px] leading-none font-extrabold tracking-[-0.04em]">{fmt(price)}</span>
                    <span className="text-[15px] text-[#55524e]">{t.perMonth}</span>
                  </div>
                  <div className="mt-2 flex min-h-5 flex-wrap gap-[10px] text-[14px]">
                    {yearly ? (
                      <>
                        <span className="text-[#8a8783] line-through">{fmt(monthly)}</span>
                        <span className="font-bold text-[#EC3016]">
                          {t.save(fmt(yearlySaving(prices, p.id, c)))}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#55524e]">{t.billedMonthly}</span>
                    )}
                  </div>
                </div>
                <Link
                  href={ctaHref(p.id)}
                  className={`border-[1.5px] px-5 py-[15px] text-center text-[16px] font-bold hover:border-[#EC3016] hover:bg-[#EC3016] hover:text-white ${
                    p.popular
                      ? "border-[#EC3016] bg-[#EC3016] text-white"
                      : "border-[#161514] bg-white text-[#161514]"
                  }`}
                >
                  {t.startTrial}
                </Link>
                <span className="-mt-2 text-center text-[13px] text-[#6b6864]">
                  {c
                    ? t.perAd(`$${(price / c).toFixed(2)}`, yearly)
                    : t.upgradeAnytime}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col gap-3 min-[820px]:hidden">
          <span className="text-[20px] font-extrabold">{t.compare}</span>
          <Toggle
            options={PLANS.map((p, i) => ({ label: p.name, value: String(i) }))}
            value={String(compare)}
            onChange={(v) => setCompare(Number(v))}
            stretch
          />
        </div>

        {/* Feature comparison */}
        <div className={`mt-3 grid border border-[#dcd9d5] bg-white min-[820px]:mt-0 ${gridCols}`}>
          {FEATURES.map(([label, values], ri) => {
            const last = ri === FEATURES.length - 1;
            return (
              <div key={label} className="contents">
                <div
                  className={`flex items-center border-t border-[#e7e5e2] px-4 py-[14px] text-[15px] ${
                    ri < BOLD_ROWS ? "font-bold" : "font-medium"
                  }`}
                >
                  {t.features[label]}
                </div>
                {PLANS.map((p, ci) => {
                  const raw =
                    values === "credits"
                      ? credits[p.id]
                        ? String(creditsOf(prices, p.id, credits[p.id]))
                        : "—"
                      : values === "turnaround"
                        ? t.turnaround[ci]
                        : values[ci];
                  const isBool = typeof raw === "boolean";
                  const pop = p.popular;
                  return (
                    <div
                      key={p.id}
                      className={`items-center justify-center border-t border-l border-[#e7e5e2] px-3 py-[14px] text-center text-[15px] font-bold ${
                        ci === compare ? "flex" : "hidden min-[820px]:flex"
                      } ${
                        isBool
                          ? raw
                            ? "bg-[#EEF7F1] text-[#1f8a4c]"
                            : "bg-[#F7F6F4] text-[#b3afaa]"
                          : "bg-white text-[#161514]"
                      } ${
                        pop
                          ? `min-[820px]:border-x-2 min-[820px]:border-x-[#EC3016] ${last ? "min-[820px]:border-b-2 min-[820px]:border-b-[#EC3016]" : ""}`
                          : ""
                      }`}
                    >
                      {isBool ? (raw ? "✓" : "—") : raw}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Enterprise: above the biggest Agency tier, talk to the team. */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-6 bg-[#161514] p-[clamp(24px,4vw,40px)] text-white">
          <div className="flex max-w-[640px] flex-col gap-2.5">
            <div className={`${mono} text-[#FF6A52]`}>{t.enterpriseEyebrow}</div>
            <h3 className="m-0 text-[clamp(26px,3vw,36px)] leading-[1.1] font-extrabold tracking-[-0.02em]">
              {t.enterpriseTitle}
            </h3>
            <p className="m-0 text-[17px] leading-[1.55] text-pretty text-[#d8d5d1]">
              {t.enterpriseLead}
            </p>
          </div>
          <a suppressHydrationWarning
            href="#contact"
            className="shrink-0 bg-white px-6 py-[15px] text-[16px] font-bold whitespace-nowrap text-[#161514] hover:bg-[#EC3016] hover:text-white"
          >
            {t.talkToUs}
          </a>
        </div>
        <p className="mt-5 text-[14px] text-[#6b6864]">
          {t.footnote}
        </p>
      </div>
    </section>
  );
}
