"use client";

import { useEffect, useState } from "react";
import { api, type PlanCatalog } from "@/lib/api";
import { DEFAULT_PRICES, type PriceList } from "@/lib/plans";

// The live price list, fetched once per page load and shared by every
// component that shows prices. Starts from the defaults so nothing renders
// empty; an admin's save (setPlanPrices) updates everything on the page.
let cache: PriceList | null = null;
let pending: Promise<void> | null = null;
const listeners = new Set<(prices: PriceList) => void>();

function toPriceList(plans: PlanCatalog): PriceList {
  const list = structuredClone(DEFAULT_PRICES);
  for (const plan of plans) {
    if (!(plan.id in list)) continue;
    list[plan.id] = Object.fromEntries(
      plan.tiers.map((t) => [t.volume, { monthly: t.monthly, yearly: t.yearly }])
    );
  }
  return list;
}

export function setPlanPrices(plans: PlanCatalog) {
  cache = toPriceList(plans);
  listeners.forEach((fn) => fn(cache!));
}

function load() {
  pending ??= api
    .getPlans()
    .then(({ plans }) => setPlanPrices(plans))
    .catch(() => {})
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function usePlanPrices(): PriceList {
  const [prices, setPrices] = useState<PriceList>(cache ?? DEFAULT_PRICES);
  useEffect(() => {
    listeners.add(setPrices);
    if (!cache) load();
    return () => {
      listeners.delete(setPrices);
    };
  }, []);
  return prices;
}
