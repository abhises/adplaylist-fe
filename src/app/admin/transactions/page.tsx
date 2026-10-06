"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import LineChart from "@/components/LineChart";
import Pagination, { usePagination } from "@/components/Pagination";
import Spinner from "@/components/Spinner";
import {
  api,
  type AdminCredits,
  type AdminPayments,
  type TransactionRange,
} from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

const TABS = ["Payments", "Credits"] as const;
type Tab = (typeof TABS)[number];

const RANGES: { days: TransactionRange; label: string }[] = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
];

const PAYMENT_REASONS: Record<string, string> = {
  subscription_create: "New subscription",
  subscription_cycle: "Renewal",
  subscription_update: "Plan change",
  manual: "Manual",
};

const CREDIT_REASONS: Record<string, string> = {
  trial: "Trial credits",
  refill: "Monthly refill",
  upgrade: "Upgrade",
  spent: "Used on a request",
  refunded: "Refunded",
  expired: "Expired",
  adjustment: "Adjustment",
};

const PAYMENT_STATUS: Record<string, string> = {
  paid: "bg-emerald-600/15 text-emerald-700",
  open: "bg-amber-500/15 text-amber-700",
  void: "bg-ink/10 text-ink-muted",
  uncollectible: "bg-brand/10 text-brand",
};

const th =
  "border-b border-ink/15 px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.08em] text-ink-muted uppercase";
const td = "border-b border-ink/10 px-4 py-3";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(currency: string) {
  const formatter = new Intl.NumberFormat("en", { style: "currency", currency });
  return (n: number) => formatter.format(n);
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/15 bg-card px-4 py-3">
      <p className="text-[11px] font-medium tracking-[0.08em] text-ink-muted uppercase">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink tabular-nums">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 border border-ink/15 bg-card p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function PaymentsView({ data }: { data: AdminPayments }) {
  const format = money(data.currency);
  const pagination = usePagination(data.payments.length, "adplaylist_tx_payments_page_size");
  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Revenue" value={format(data.totals.revenue)} />
        <StatTile label="Paid invoices" value={String(data.totals.payments)} />
        <StatTile label="Average payment" value={format(data.totals.average)} />
      </div>

      <ChartCard title="Revenue per day">
        <LineChart
          data={data.series}
          series={[{ key: "revenue", label: "Revenue", color: "var(--viz-1)" }]}
          format={(n) => format(n).replace(/\.00$/, "")}
          label={`Revenue per day over the last ${data.days} days`}
        />
      </ChartCard>

      <section className="mt-4 overflow-x-auto border border-ink/15 bg-card">
        {data.payments.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">No payments in this period.</p>
        ) : (
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2/60">
                {["S.N.", "Date", "Customer", "Description", "Type", "Status", "Amount", ""].map((h) => (
                  <th key={h} className={`${th} ${h === "Amount" ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.payments.slice(pagination.start, pagination.end).map((p, i) => (
                <tr key={p.id} className="transition-colors hover:bg-surface-2/50">
                  <td className={`${td} w-14 font-mono text-xs text-ink-muted tabular-nums`}>
                    {pagination.start + i + 1}
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink-muted`}>{formatDateTime(p.date)}</td>
                  <td className={td}>
                    <p className="font-semibold text-ink">{p.company ?? "—"}</p>
                    {p.email && <p className="text-xs text-ink-muted">{p.email}</p>}
                  </td>
                  <td className={`${td} max-w-[280px] text-ink-muted`}>
                    <p className="line-clamp-2">{p.description}</p>
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink-muted`}>
                    {(p.reason && PAYMENT_REASONS[p.reason]) ?? p.reason ?? "—"}
                  </td>
                  <td className={td}>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold capitalize ${
                        PAYMENT_STATUS[p.status ?? ""] ?? "bg-ink/10 text-ink-muted"
                      }`}
                    >
                      {p.status === "paid" && p.amountPaid === 0 ? "No charge" : p.status}
                    </span>
                  </td>
                  <td className={`${td} text-right font-semibold whitespace-nowrap text-ink tabular-nums`}>
                    {money(p.currency)(p.status === "paid" ? p.amountPaid : p.amount)}
                  </td>
                  <td className={`${td} text-right`}>
                    {p.receiptUrl && (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        Invoice
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {data.payments.length > 0 && <Pagination {...pagination.props} />}
    </>
  );
}

function CreditsView({ data }: { data: AdminCredits }) {
  const pagination = usePagination(data.entries.length, "adplaylist_tx_credits_page_size");
  const count = (n: number) => n.toLocaleString("en");
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Credits granted" value={count(data.totals.granted)} />
        <StatTile label="Credits used" value={count(data.totals.used)} />
        <StatTile label="Credits expired" value={count(data.totals.expired)} />
        <StatTile label="Transactions" value={count(data.totals.entries)} />
      </div>

      <ChartCard title="Credits per day">
        <LineChart
          data={data.series}
          series={[
            { key: "granted", label: "Granted", color: "var(--viz-1)" },
            { key: "used", label: "Used", color: "var(--viz-2)" },
            { key: "expired", label: "Expired", color: "var(--viz-3)" },
          ]}
          format={count}
          label={`Credits granted, used and expired per day over the last ${data.days} days`}
        />
      </ChartCard>

      <section className="mt-4 overflow-x-auto border border-ink/15 bg-card">
        {data.entries.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">No credit transactions in this period.</p>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2/60">
                {["S.N.", "Date", "Account", "Type", "Note", "Change", "Balance"].map((h) => (
                  <th
                    key={h}
                    className={`${th} ${h === "Change" || h === "Balance" ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.entries.slice(pagination.start, pagination.end).map((e, i) => (
                <tr key={e.id} className="transition-colors hover:bg-surface-2/50">
                  <td className={`${td} w-14 font-mono text-xs text-ink-muted tabular-nums`}>
                    {pagination.start + i + 1}
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink-muted`}>{formatDateTime(e.date)}</td>
                  <td className={td}>
                    <p className="font-semibold text-ink">{e.company}</p>
                    {e.email && <p className="text-xs text-ink-muted">{e.email}</p>}
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink-muted`}>
                    {CREDIT_REASONS[e.reason] ?? e.reason}
                  </td>
                  <td className={`${td} max-w-[320px] text-ink-muted`}>
                    <p className="line-clamp-2">{e.note ?? "—"}</p>
                  </td>
                  <td
                    className={`${td} text-right font-semibold tabular-nums ${
                      e.delta > 0 ? "text-emerald-700" : e.delta < 0 ? "text-brand" : "text-ink-muted"
                    }`}
                  >
                    {e.delta > 0 ? `+${e.delta}` : e.delta}
                  </td>
                  <td className={`${td} text-right text-ink tabular-nums`}>{e.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {data.entries.length > 0 && <Pagination {...pagination.props} />}
    </>
  );
}

export default function TransactionsPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const [tab, setTab] = useState<Tab>("Payments");
  const [days, setDays] = useState<TransactionRange>(30);
  const [payments, setPayments] = useState<AdminPayments | null>(null);
  const [credits, setCredits] = useState<AdminCredits | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Each tab loads its own data when opened or when the range changes.
  const key = `${tab}:${days}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== key && !error;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load =
      tab === "Payments"
        ? api.getAdminPayments(days).then((d) => !cancelled && setPayments(d))
        : api.getAdminCredits(days).then((d) => !cancelled && setCredits(d));
    load
      .then(() => !cancelled && setLoadedKey(`${tab}:${days}`))
      .catch(() => !cancelled && setError(`Couldn't load ${tab.toLowerCase()}.`));
    return () => {
      cancelled = true;
    };
  }, [user, tab, days]);

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-10">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">Admin</p>
        <h1 className="text-3xl font-extrabold text-ink">Transactions</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Every customer&rsquo;s payments (from Stripe) and credit movements.
        </p>

        {/* Filters in one row: which ledger, and the time range. */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex border border-border">
            {TABS.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setError(null);
                  setTab(t);
                }}
                className={`px-5 py-2 text-sm ${i > 0 ? "border-l border-border" : ""} ${
                  tab === t ? "bg-brand font-semibold text-brand-foreground" : "text-ink hover:bg-surface-2"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex border border-border">
            {RANGES.map((r, i) => (
              <button
                key={r.days}
                type="button"
                onClick={() => {
                  setError(null);
                  setDays(r.days);
                }}
                className={`px-3 py-[7px] text-xs ${i > 0 ? "border-l border-border" : ""} ${
                  days === r.days ? "bg-ink text-surface" : "text-ink hover:bg-surface-2"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-8 text-sm text-brand">{error}</p>}
        {loading && (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading {tab.toLowerCase()}…
          </div>
        )}
        {!loading && !error && tab === "Payments" && payments && <PaymentsView data={payments} />}
        {!loading && !error && tab === "Credits" && credits && <CreditsView data={credits} />}
      </main>
    </div>
  );
}
