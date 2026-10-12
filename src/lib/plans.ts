import type {
  Account,
  AccountStatus,
  BillingCycle,
  CreditCosts,
  Entitlements,
  PlanId,
  User,
} from "@/lib/api";

// Volume (each tier's fixed id) → price in USD, monthly and yearly, and the
// credits a month the tier gives. Admins edit these (/admin/pricing);
// usePlanPrices() loads the live list from the API.
export type TierPrice = { monthly: number; yearly: number; credits: number };
export type PriceList = Record<PlanId, Record<number, TierPrice>>;

// What's shown until the live list loads: the backend's defaults.
export const DEFAULT_PRICES: PriceList = {
  starter: { 0: { monthly: 15, yearly: 144, credits: 10 } },
  pro: {
    10: { monthly: 49, yearly: 470.4, credits: 50 },
    20: { monthly: 95, yearly: 912, credits: 100 },
    30: { monthly: 139, yearly: 1334.4, credits: 150 },
    40: { monthly: 179, yearly: 1718.4, credits: 200 },
  },
  agency: {
    50: { monthly: 215, yearly: 2064, credits: 250 },
    70: { monthly: 289, yearly: 2774.4, credits: 350 },
    100: { monthly: 399, yearly: 3830.4, credits: 500 },
    150: { monthly: 499, yearly: 4790.4, credits: 750 },
  },
};

// What requests cost in credits and what each plan's trial gets, until the
// live values load: the backend's defaults.
export const DEFAULT_CREDIT_COSTS: CreditCosts = {
  image: 5,
  video: 10,
  imageRevision: 2,
  videoRevision: 4,
  extraSize: 1,
  canvaEdit: 2,
  similarDesign: 5,
};

export const DEFAULT_TRIAL_CREDITS: Record<PlanId, number> = { starter: 5, pro: 10, agency: 10 };

// "5 credits", "1 credit".
export function fmtCredits(n: number) {
  return `${n} ${n === 1 ? "credit" : "credits"}`;
}

// What a new request costs: an image ad, a video ad or both, plus each
// extra size.
export function requestCost(
  costs: CreditCosts,
  media: readonly ("image" | "video")[],
  extraSizes = 0
) {
  return (
    (media.includes("image") ? costs.image : 0) +
    (media.includes("video") ? costs.video : 0) +
    extraSizes * costs.extraSize
  );
}

// What revising a delivered request costs, by what was delivered (older and
// one-click requests are images).
export function revisionCost(costs: CreditCosts, media?: readonly ("image" | "video")[]) {
  const of = media?.length ? media : ["image"];
  return (
    (of.includes("image") ? costs.imageRevision : 0) +
    (of.includes("video") ? costs.videoRevision : 0)
  );
}

export const PLAN_NAMES: Record<PlanId, string> = {
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
};

export const PLAN_IDS = Object.keys(DEFAULT_PRICES) as PlanId[];

export function volumesOf(prices: PriceList, plan: PlanId) {
  return Object.keys(prices[plan]).map(Number).sort((a, b) => a - b);
}

// Credits a month a tier gives.
export function creditsOf(prices: PriceList, plan: PlanId, volume: number) {
  return prices[plan][volume]?.credits ?? 0;
}

export function defaultVolume(plan: PlanId) {
  return volumesOf(DEFAULT_PRICES, plan)[0] ?? 0;
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in DEFAULT_PRICES;
}

export function isValidVolume(plan: PlanId, volume: number) {
  return volume in DEFAULT_PRICES[plan];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Price per month at the given cycle; yearly is shown as its monthly
// equivalent (the yearly price ÷ 12).
export function monthlyPrice(prices: PriceList, plan: PlanId, volume: number, cycle: BillingCycle) {
  const p = prices[plan][volume];
  if (!p) return 0;
  return cycle === "yearly" ? round2(p.yearly / 12) : p.monthly;
}

export function yearlyTotal(prices: PriceList, plan: PlanId, volume: number) {
  return prices[plan][volume]?.yearly ?? 0;
}

// What paying yearly saves over twelve monthly payments.
export function yearlySaving(prices: PriceList, plan: PlanId, volume: number) {
  const p = prices[plan][volume];
  return p ? round2(p.monthly * 12 - p.yearly) : 0;
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
export function periodPrice(prices: PriceList, account: Account) {
  const p = prices[account.plan][account.creditVolume];
  if (!p) return 0;
  return account.billingCycle === "yearly" ? p.yearly : p.monthly;
}
