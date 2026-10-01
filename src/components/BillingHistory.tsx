"use client";

import { useEffect, useState } from "react";
import {
  api,
  type CreditEntry,
  type CreditTotals,
  type Payment,
  type UpcomingPayment,
} from "@/lib/api";
import { fmtDate, fmtUsd } from "@/lib/plans";

const REASON_LABELS: Record<CreditEntry["reason"], string> = {
  trial: "Trial credits",
  refill: "Monthly refill",
  upgrade: "Upgrade",
  spent: "Request",
  refunded: "Refund",
  expired: "Expired",
  adjustment: "Adjustment",
};

// Lifetime credit totals plus every change, newest first. `version` changes
// whenever the account's balance or status does, so this reloads with it.
export function CreditHistory({ version }: { version: string }) {
  const [totals, setTotals] = useState<CreditTotals | null>(null);
  const [entries, setEntries] = useState<CreditEntry[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .getCreditHistory()
      .then((res) => {
        setTotals(res.totals);
        setEntries(res.entries);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [version]);

  return (
    <section className="mt-10 border-2 border-ink/15 p-6">
      <h2 className="text-xl font-extrabold text-ink">Credit history</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Credits are shared by everyone on the account. Unused credits expire
        when the next month&apos;s credits arrive.
      </p>

      {failed && <p className="mt-4 text-sm text-brand">Couldn&apos;t load credit history.</p>}

      {totals && (
        <dl className="mt-5 grid grid-cols-2 gap-px border border-ink/15 bg-ink/15 sm:grid-cols-4">
          {(
            [
              ["Total received", totals.received],
              ["Used", totals.used],
              ["Expired", totals.expired],
              ["Available now", totals.available],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="bg-surface p-4">
              <dt className="text-xs text-ink-muted">{label}</dt>
              <dd className="mt-1 text-2xl font-extrabold text-ink tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {entries.length === 0 ? (
        !failed && <p className="mt-5 text-sm text-ink-muted">No credit activity yet.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-ink/15">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Details</th>
                <th className="py-2 pr-4 text-right font-medium">Change</th>
                <th className="py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-ink/10">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-ink-muted">{fmtDate(e.createdAt)}</td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-ink">{REASON_LABELS[e.reason] ?? e.reason}</td>
                  <td className="py-2.5 pr-4 text-ink">{e.note}</td>
                  <td
                    className={`py-2.5 pr-4 text-right font-bold tabular-nums ${
                      e.delta > 0 ? "text-ink" : "text-ink-muted"
                    }`}
                  >
                    {e.delta > 0 ? `+${e.delta}` : e.delta}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-ink">{e.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function paymentLabel(p: Payment) {
  if (p.reason === "subscription_create") return p.amount === 0 ? "Free trial started" : "Subscribed";
  if (p.reason === "subscription_cycle") return "Renewal";
  if (p.reason === "subscription_update") return "Plan change";
  return "Payment";
}

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  open: "Due",
  void: "Void",
  uncollectible: "Failed",
};

// Every invoice from Stripe, with a receipt link. Owner only (billing).
export function PaymentHistory({ version }: { version: string }) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingPayment | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .getPayments()
      .then((res) => {
        setPayments(res.payments);
        setUpcoming(res.upcoming);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [version]);

  const totalPaid = (payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amountPaid, 0);
  const totalCredits = (payments ?? []).reduce((sum, p) => sum + p.credits, 0);

  return (
    <section className="mt-10 border-2 border-ink/15 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-extrabold text-ink">Payments</h2>
        {payments && payments.length > 0 && (
          <p className="text-sm text-ink-muted">
            Total paid:{" "}
            <span className="font-bold text-ink">{fmtUsd(Math.round(totalPaid * 100) / 100)}</span>
            {" · "}
            Credits received: <span className="font-bold text-ink">{totalCredits}</span>
          </p>
        )}
      </div>

      {failed && <p className="mt-4 text-sm text-brand">Couldn&apos;t load payments.</p>}
      {upcoming && (
        <div className="mt-4 border border-ink/15 bg-ink/5 px-4 py-3 text-sm text-ink">
          <span className="font-bold">Next payment: {fmtUsd(upcoming.amount)}</span>
          {upcoming.date && <> on {fmtDate(upcoming.date)}</>}
          <span className="text-ink-muted"> · {upcoming.description}</span>
        </div>
      )}

      {payments?.length === 0 && (
        <p className="mt-4 text-sm text-ink-muted">No payments yet.</p>
      )}

      {payments && payments.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-ink/15">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Details</th>
                <th className="py-2 pr-4 text-right font-medium">Amount</th>
                <th className="py-2 pr-4 text-right font-medium">Credits</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-ink/10">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-ink-muted">{fmtDate(p.date)}</td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-ink">{paymentLabel(p)}</td>
                  <td className="py-2.5 pr-4 text-ink">{p.description}</td>
                  <td className="py-2.5 pr-4 text-right font-bold whitespace-nowrap tabular-nums text-ink">
                    {fmtUsd(p.status === "paid" ? p.amountPaid : p.amount)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-bold whitespace-nowrap tabular-nums text-ink">
                    {p.credits > 0 ? `+${p.credits}` : "—"}
                  </td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-ink">
                    {/* A $0 trial invoice is "paid" to Stripe, but nothing was charged. */}
                    {p.status === "paid" && p.amountPaid === 0
                      ? "No charge"
                      : (STATUS_LABELS[p.status ?? ""] ?? p.status)}
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    {p.receiptUrl ? (
                      <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-brand">
                        View
                      </a>
                    ) : (
                      "—"
                    )}
                    {p.pdfUrl && (
                      <>
                        {" · "}
                        <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="text-brand">
                          PDF
                        </a>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
