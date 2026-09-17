"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { useRequireAuth } from "@/lib/AuthProvider";

const PLAN = {
  name: "Starter Plan",
  status: "Active subscription",
  monthly: { price: "€9.99", suffix: "/mo", renews: "Renews Oct 15, 2026" },
  yearly: { price: "€99.99", suffix: "/yr", renews: "Renews Sep 15, 2027" },
};

const CREDIT_TIERS = [
  { credits: 10, price: "€10", perCredit: "€1.00 per credit" },
  {
    credits: 50,
    price: "€45",
    off: "10% off",
    perCredit: "€0.90 per credit",
    popular: true,
  },
  { credits: 100, price: "€80", off: "20% off", perCredit: "€0.80 per credit" },
];

export default function BillingPage() {
  const { user, ready } = useRequireAuth();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [notice, setNotice] = useState<string | null>(null);

  if (!ready || !user) return null;

  const plan = PLAN[cycle];

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <h1 className="text-3xl font-extrabold text-ink">Billing &amp; Credits</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Manage your subscription, credits, and payment methods.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="border border-ink/15 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-ink">{PLAN.name}</h2>
                <p className="mt-1 text-sm text-ink-muted">{PLAN.status}</p>
              </div>
              <div className="text-right">
                <div className="flex border border-ink/15">
                  <button
                    onClick={() => setCycle("monthly")}
                    className={`px-3 py-1.5 text-sm font-bold ${
                      cycle === "monthly"
                        ? "bg-brand text-brand-foreground"
                        : "text-ink"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setCycle("yearly")}
                    className={`px-3 py-1.5 text-sm font-bold ${
                      cycle === "yearly"
                        ? "bg-brand text-brand-foreground"
                        : "text-ink"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-ink">
                  {plan.price}
                  <span className="text-sm font-normal text-ink-muted">
                    {plan.suffix}
                  </span>
                </p>
                <p className="mt-1 text-xs text-ink-muted">{plan.renews}</p>
              </div>
            </div>
          </div>

          <div className="border border-ink/15 p-6">
            <h2 className="text-xl font-extrabold text-ink">Payment Methods</h2>
            <p className="mt-2 text-sm text-ink-muted">
              View invoices, update payment methods, and manage your billing
              in the Stripe customer portal.
            </p>
            <button
              onClick={() =>
                setNotice("Stripe isn't connected in this demo yet.")
              }
              className="mt-4 flex items-center gap-2 border border-border px-4 py-2 text-sm font-bold text-ink"
            >
              <span aria-hidden>&#8599;</span> Manage in Stripe
            </button>
          </div>
        </div>

        <div className="mt-10 border border-ink/15 p-6">
          <h2 className="text-xl font-extrabold text-ink">Buy Credits</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Buy credits to request and receive new ads. Credits never expire.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {CREDIT_TIERS.map((tier) => (
              <div
                key={tier.credits}
                className={`relative border p-5 ${
                  tier.popular ? "border-brand" : "border-ink/15"
                }`}
              >
                {tier.popular && (
                  <span className="absolute top-0 right-0 bg-brand px-2 py-1 text-[10px] font-bold tracking-[0.5px] text-brand-foreground uppercase">
                    Popular
                  </span>
                )}
                <p className="text-sm text-ink">{tier.credits} Credits</p>
                <p className="mt-2 text-2xl font-extrabold text-ink">
                  {tier.price}{" "}
                  {tier.off && (
                    <span className="text-sm font-bold text-brand">
                      {tier.off}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{tier.perCredit}</p>
                <button
                  onClick={() =>
                    setNotice(
                      `Stripe isn't connected in this demo yet — ${tier.credits} credits would cost ${tier.price}.`
                    )
                  }
                  className={`mt-4 w-full py-2 text-sm font-bold ${
                    tier.popular
                      ? "bg-brand text-brand-foreground"
                      : "border border-border text-ink"
                  }`}
                >
                  Buy now
                </button>
              </div>
            ))}
          </div>
        </div>

        {notice && (
          <p className="mt-6 text-sm text-ink-muted">{notice}</p>
        )}
      </main>
    </div>
  );
}
