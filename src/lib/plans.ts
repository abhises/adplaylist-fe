import type { Account, AccountStatus, BillingCycle, Entitlements, PlanId, User } from "@/lib/api";

// Mirrors adplaylist-be/src/lib/plans.ts — what customers are shown. Stripe
// holds the prices actually charged.

// Custom ads (credits) per month → monthly price in USD.
export const PLAN_TIERS: Record<PlanId, Record<number, number>> = {
  starter: { 0: 15 },
  pro: { 10: 49, 20: 95, 30: 139, 40: 179 },
  agency: { 50: 215, 70: 289, 100: 399, 150: 499 },
};

export const PLAN_NAMES: Record<PlanId, string> = {
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
};

export const PLAN_IDS = Object.keys(PLAN_TIERS) as PlanId[];
export const YEARLY_DISCOUNT = 0.2;

export function defaultVolume(plan: PlanId) {
  return Number(Object.keys(PLAN_TIERS[plan])[0]);
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLAN_TIERS;
}

export function isValidVolume(plan: PlanId, volume: number) {
  return volume in PLAN_TIERS[plan];
}

// Price per month at the given cycle (yearly is shown as its monthly
// equivalent, 20% off).
export function monthlyPrice(plan: PlanId, volume: number, cycle: BillingCycle) {
  const monthly = PLAN_TIERS[plan][volume];
  return cycle === "yearly"
    ? Math.round(monthly * (1 - YEARLY_DISCOUNT) * 100) / 100
    : monthly;
}

export function yearlyTotal(plan: PlanId, volume: number) {
  return Math.round(PLAN_TIERS[plan][volume] * 12 * (1 - YEARLY_DISCOUNT) * 100) / 100;
}

export function fmtUsd(n: number) {
  return (
    "$" +
    n.toLocaleString(
      "en-US",
      Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )
  );
}

export const STATUS_LABELS: Record<AccountStatus, string> = {
  trial: "Free trial",
  active: "Active",
  past_due: "Payment past due",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function fmtDate(iso: string | null | undefined) {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
}

export function daysUntil(iso: string | null | undefined) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

// Whether the signed-in user's plan allows an action. Staff (no account)
// can do everything their role allows; the server enforces this too.
export function can(user: User | null, feature: keyof Entitlements) {
  if (!user) return false;
  return !user.account || user.account.entitlements[feature];
}

// What the account's plan costs per billing period, in USD (excl. tax).
export function periodPrice(account: Account) {
  return account.billingCycle === "yearly"
    ? yearlyTotal(account.plan, account.creditVolume)
    : (PLAN_TIERS[account.plan][account.creditVolume] ?? 0);
}
