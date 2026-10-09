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
import { headRow, row, Tag, tableCard, td, th } from "@/components/DataTable";
import Pagination, { usePagination } from "@/components/Pagination";

const REASON_LABELS: Record<CreditEntry["reason"], string> = {
  trial: "Trial credits",
  refill: "Monthly refill",
  upgrade: "Upgrade",
  spent: "Request",
  refunded: "Refund",
  expired: "Expired",
  adjustment: "Adjustment",
};

// Rows per page for the billing tables; the list starts short.
const PAGE_SIZES = [3, 10, 30, 50];

// Lifetime credit totals plus every change, newest first. `version` changes
// whenever the account's balance or status does, so this reloads with it.
export function CreditHistory({ version }: { version: string }) {
  const [totals, setTotals] = useState<CreditTotals | null>(null);
  const [entries, setEntries] = useState<CreditEntry[]>([]);
  const [failed, setFailed] = useState(false);
  const pagination = usePagination(entries.length, "adplaylist_credits_page_size", {
    options: PAGE_SIZES,
    defaultSize: 3,
  });

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
        <>
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
                {entries.slice(pagination.start, pagination.end).map((e) => (
                  <tr key={e.id} className="border-b border-ink/10">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-ink-muted">{fmtDate(e.createdAt)}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-ink">
                      {e.reason === "spent" && e.note?.startsWith("Canva edit:")
                        ? "Canva edit"
                        : e.reason === "spent" && e.note?.startsWith("Similar design:")
                          ? "Similar design"
                          : (REASON_LABELS[e.reason] ?? e.reason)}
                    </td>
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
          <Pagination {...pagination.props} />
        </>
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

// Invoice statuses as coloured tags. A $0 trial invoice is "paid" to Stripe,
// but nothing was charged.
function paymentStatus(p: Payment): [string, string] {
  if (p.status === "paid" && p.amountPaid === 0) return ["No charge", "bg-ink/10 text-ink-muted"];
  if (p.status === "paid") return ["Paid", "bg-emerald-600/15 text-emerald-700"];
  if (p.status === "open") return ["Due", "bg-amber-500/15 text-amber-700"];
  if (p.status === "uncollectible") return ["Failed", "bg-brand/10 text-brand"];
  if (p.status === "void") return ["Void", "bg-ink/10 text-ink-muted"];
  return [p.status ?? "—", "bg-ink/10 text-ink-muted"];
}

const linkButton =
  "inline-flex items-center gap-1 border border-ink/20 px-2.5 py-1 text-xs font-semibold text-ink hover:border-ink/60 disabled:opacity-50";

// Every invoice from Stripe, with a receipt link and our own PDF. Owner only
// (billing).
export function PaymentHistory({ version }: { version: string }) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingPayment | null>(null);
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const pagination = usePagination(payments?.length ?? 0, "adplaylist_payments_page_size", {
    options: PAGE_SIZES,
    defaultSize: 3,
  });

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

  async function downloadPdf(p: Payment) {
    setDownloading(p.id);
    setDownloadError(null);
    try {
      await api.downloadInvoicePdf(p.id, `adplaylist-${p.number ?? p.id}.pdf`);
    } catch {
      setDownloadError("Couldn't download that PDF. Try again in a moment.");
    } finally {
      setDownloading(null);
    }
  }

  const totalPaid = (payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amountPaid, 0);
  const totalCredits = (payments ?? []).reduce((sum, p) => sum + p.credits, 0);

  return (
    <section className="mt-10 border-2 border-ink/15 p-6">
      <h2 className="text-xl font-extrabold text-ink">Payments</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Every charge on your plan, with a receipt and a PDF for your records.
      </p>

      {failed && <p className="mt-4 text-sm text-brand">Couldn&apos;t load payments.</p>}

      {payments && (payments.length > 0 || upcoming) && (
        <dl className="mt-5 grid grid-cols-1 gap-px border border-ink/15 bg-ink/15 sm:grid-cols-3">
          <div className="bg-surface p-4">
            <dt className="text-xs text-ink-muted">Total paid</dt>
            <dd className="mt-1 text-2xl font-extrabold text-ink tabular-nums">
              {fmtUsd(Math.round(totalPaid * 100) / 100)}
            </dd>
          </div>
          <div className="bg-surface p-4">
            <dt className="text-xs text-ink-muted">Credits received</dt>
            <dd className="mt-1 text-2xl font-extrabold text-ink tabular-nums">{totalCredits}</dd>
          </div>
          <div className="border-l-2 border-brand bg-surface p-4">
            <dt className="text-xs text-ink-muted">Next payment</dt>
            {upcoming ? (
              <>
                <dd className="mt-1 text-2xl font-extrabold text-ink tabular-nums">
                  {fmtUsd(upcoming.amount)}
                </dd>
                <dd className="mt-0.5 text-xs text-ink-muted">
                  {upcoming.date ? `on ${fmtDate(upcoming.date)} · ` : ""}
                  {upcoming.description}
                </dd>
              </>
            ) : (
              <dd className="mt-1 text-2xl font-extrabold text-ink-muted">—</dd>
            )}
          </div>
        </dl>
      )}

      {payments?.length === 0 && (
        <p className="mt-5 text-sm text-ink-muted">No payments yet.</p>
      )}

      {payments && payments.length > 0 && (
        <>
          <div className={`mt-5 ${tableCard}`}>
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className={headRow}>
                  <th className={th}>Date</th>
                  <th className={th}>Payment</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={`${th} text-right`}>Credits</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(pagination.start, pagination.end).map((p) => {
                  const [statusText, statusClass] = paymentStatus(p);
                  return (
                    <tr key={p.id} className={row}>
                      <td className={`${td} whitespace-nowrap text-ink-muted tabular-nums`}>
                        {fmtDate(p.date)}
                      </td>
                      <td className={td}>
                        <p className="font-semibold text-ink">{paymentLabel(p)}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {p.description}
                          {p.number && <span className="font-mono"> · {p.number}</span>}
                        </p>
                      </td>
                      <td className={`${td} text-right text-base font-extrabold whitespace-nowrap tabular-nums text-ink`}>
                        {fmtUsd(p.status === "paid" ? p.amountPaid : p.amount)}
                      </td>
                      <td className={`${td} text-right whitespace-nowrap tabular-nums`}>
                        {p.credits > 0 ? (
                          <span className="font-bold text-ink">+{p.credits}</span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className={td}>
                        <Tag className={statusClass}>{statusText}</Tag>
                      </td>
                      <td className={`${td} text-right whitespace-nowrap`}>
                        {p.receiptUrl && (
                          <a
                            suppressHydrationWarning
                            href={p.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={linkButton}
                          >
                            View
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => downloadPdf(p)}
                          disabled={downloading === p.id}
                          className={`ml-2 ${linkButton} border-brand/40 text-brand hover:border-brand`}
                        >
                          <span aria-hidden>↓</span>
                          {downloading === p.id ? "Preparing…" : "PDF"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {downloadError && <p className="mt-2 text-sm text-brand">{downloadError}</p>}
          <Pagination {...pagination.props} />
        </>
      )}
    </section>
  );
}
