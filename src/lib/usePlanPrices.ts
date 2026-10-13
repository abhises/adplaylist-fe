"use client";

import { useEffect, useState } from "react";
import {
  api,
  type CreditCosts,
  type PlanId,
  type PriceCatalog,
  type ReferralRewards,
} from "@/lib/api";
import {
  DEFAULT_CREDIT_COSTS,
  DEFAULT_PRICES,
  DEFAULT_REFERRAL_REWARDS,
  DEFAULT_TRIAL_CREDITS,
  type PriceList,
} from "@/lib/plans";

// The live price list, fetched once per page load and shared by every
// component that shows prices or credit costs. Starts from the defaults so
// nothing renders empty; an admin's save (setPriceCatalog) updates
// everything on the page.
type Catalog = {
  prices: PriceList;
  creditCosts: CreditCosts;
  trialCredits: Record<PlanId, number>;
  referralRewards: ReferralRewards;
};

const DEFAULTS: Catalog = {
  prices: DEFAULT_PRICES,
  creditCosts: DEFAULT_CREDIT_COSTS,
  trialCredits: DEFAULT_TRIAL_CREDITS,
  referralRewards: DEFAULT_REFERRAL_REWARDS,
};

let cache: Catalog | null = null;
let pending: Promise<void> | null = null;
const listeners = new Set<(catalog: Catalog) => void>();

function toCatalog({ plans, creditCosts, referralRewards }: PriceCatalog): Catalog {
  const prices = structuredClone(DEFAULT_PRICES);
  const trialCredits = { ...DEFAULT_TRIAL_CREDITS };
  for (const plan of plans) {
    if (!(plan.id in prices)) continue;
    prices[plan.id] = Object.fromEntries(
      plan.tiers.map((t) => [t.volume, { monthly: t.monthly, yearly: t.yearly, credits: t.credits }])
    );
    trialCredits[plan.id] = plan.trialCredits;
  }
  return {
    prices,
    creditCosts: { ...DEFAULT_CREDIT_COSTS, ...creditCosts },
    trialCredits,
    referralRewards: { ...DEFAULT_REFERRAL_REWARDS, ...referralRewards },
  };
}

export function setPriceCatalog(catalog: PriceCatalog) {
  cache = toCatalog(catalog);
  listeners.forEach((fn) => fn(cache!));
}

function load() {
  pending ??= api
    .getPlans()
    .then(setPriceCatalog)
    .catch(() => {})
    .finally(() => {
      pending = null;
    });
  return pending;
}

function useCatalog(): Catalog {
  const [catalog, setCatalog] = useState<Catalog>(cache ?? DEFAULTS);
  useEffect(() => {
    listeners.add(setCatalog);
    if (!cache) load();
    return () => {
      listeners.delete(setCatalog);
    };
  }, []);
  return catalog;
}

export function usePlanPrices(): PriceList {
  return useCatalog().prices;
}

// What each kind of request costs in credits.
export function useCreditCosts(): CreditCosts {
  return useCatalog().creditCosts;
}

// The credits each plan's free trial gets.
export function useTrialCredits(): Record<PlanId, number> {
  return useCatalog().trialCredits;
}

// The bonus credits a referral earns each side.
export function useReferralRewards(): ReferralRewards {
  return useCatalog().referralRewards;
}
