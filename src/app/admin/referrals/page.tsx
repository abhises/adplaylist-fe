"use client";

import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import Pagination, { usePagination } from "@/components/Pagination";
import Spinner from "@/components/Spinner";
import { dangerButton } from "@/components/DataTable";
import { api, ApiError, type AdminReferral, type ReferralStatus } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FILTERS: { value: string; label: string; statuses: ReferralStatus[] | null }[] = [
  { value: "all", label: "All", statuses: null },
  { value: "pending", label: "Not paid yet", statuses: ["pending"] },
  { value: "rewarded", label: "Rewarded", statuses: ["rewarded", "waiting"] },
  { value: "blocked", label: "Not eligible", statuses: ["ineligible"] },
  { value: "undone", label: "Reversed", statuses: ["reversed", "cancelled"] },
];

const STATUS: Record<ReferralStatus, { label: string; className: string }> = {
  pending: { label: "Signed up · not paid", className: "bg-amber-500/15 text-amber-700" },
  waiting: { label: "Paid · referrer waiting", className: "bg-sky-500/15 text-sky-700" },
  rewarded: {
    label: "Rewarded",
    className: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
  },
  ineligible: { label: "Not eligible", className: "bg-ink/10 text-ink-muted" },
  reversed: { label: "Reversed", className: "bg-brand text-brand-foreground" },
  cancelled: { label: "Cancelled", className: "bg-brand text-brand-foreground" },
};

// Referrals an admin can still undo: ones that paid out, or might.
const REVERSIBLE: ReferralStatus[] = ["pending", "waiting", "rewarded"];

const th = "py-2 pr-4 text-left text-xs font-medium tracking-[0.08em] text-ink-muted uppercase";
const td = "py-3 pr-4 align-top text-sm";

function Side({ side }: { side: AdminReferral["referrer"] }) {
  return (
    <>
      <p className="font-bold text-ink">{side.name}</p>
      {side.email && <p className="text-xs text-ink-muted">{side.email}</p>}
      <p className="text-xs text-ink-muted capitalize">
        {side.plan} · {side.status.replace("_", " ")}
      </p>
    </>
  );
}

// Every referral: who referred whom, whether it paid out, and why not when
// it didn't. One that looks like abuse can be reversed here.
export default function AdminReferralsPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const [rows, setRows] = useState<AdminReferral[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [reversing, setReversing] = useState<AdminReferral | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .getAdminReferrals()
      .then(({ referrals }) => {
        setRows(referrals);
        setError(null);
      })
      .catch(() => {
        setError("Couldn't load referrals.");
        setRows((r) => r ?? []);
      });
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const statuses = FILTERS.find((f) => f.value === filter)?.statuses;
  const shown = (rows ?? []).filter((r) => !statuses || statuses.includes(r.status));
  const pagination = usePagination(shown.length, "adplaylist_referrals_page_size");
  const rewarded = (rows ?? []).filter((r) => r.status === "rewarded");
  const creditsGiven = rewarded.reduce((sum, r) => sum + r.referrerCredits + r.referredCredits, 0);

  async function reverse() {
    if (!reversing) return;
    setBusy(true);
    try {
      await api.reverseReferral(reversing.id);
      setReversing(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reverse the referral.");
      setReversing(null);
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-10">
        <h1 className="text-3xl font-extrabold text-ink">Referrals</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          Customers who signed up through another customer&apos;s referral link. Both get bonus
          credits when the new customer first pays (the amounts are set in Pricing). A referral
          isn&apos;t rewarded when the new customer paid with a card the referrer also uses, or
          once the referrer has 10 rewarded referrals in a year.
        </p>

        {rows === null ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading…
          </div>
        ) : (
          <>
            {error && <p className="mt-6 text-sm text-brand">{error}</p>}

            <div className="mt-6 flex flex-wrap gap-2">
              {(
                [
                  ["Signed up", rows.length],
                  ["Rewarded", rewarded.length],
                  ["Credits given", creditsGiven],
                ] as const
              ).map(([label, value]) => (
                <span key={label} className="border border-border px-3 py-1.5 text-xs text-ink">
                  {label} <span className="font-bold tabular-nums">{value}</span>
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={`border px-3 py-1.5 text-xs font-bold ${
                    filter === f.value
                      ? "border-brand/30 bg-brand/10 text-brand"
                      : "border-border text-ink hover:bg-surface-2"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <p className="mt-8 text-sm text-ink-muted">Nothing here yet.</p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[860px] border-t border-ink/15">
                    <thead>
                      <tr className="border-b border-ink/15">
                        <th className={th}>Signed up</th>
                        <th className={th}>Referrer</th>
                        <th className={th}>New customer</th>
                        <th className={th}>Status</th>
                        <th className={th}>Credits</th>
                        <th className={th} />
                      </tr>
                    </thead>
                    <tbody>
                      {shown.slice(pagination.start, pagination.end).map((r) => (
                        <tr key={r.id} className="border-b border-ink/10">
                          <td className={`${td} whitespace-nowrap text-ink-muted`}>
                            {when(r.createdAt)}
                          </td>
                          <td className={td}>
                            <Side side={r.referrer} />
                          </td>
                          <td className={td}>
                            <Side side={r.referred} />
                          </td>
                          <td className={`${td} max-w-xs`}>
                            <span
                              className={`px-2 py-0.5 text-xs font-bold whitespace-nowrap ${STATUS[r.status].className}`}
                            >
                              {STATUS[r.status].label}
                            </span>
                            {r.rewardedAt && (
                              <p className="mt-1 text-xs text-ink-muted">{when(r.rewardedAt)}</p>
                            )}
                            {r.note && <p className="mt-1 text-xs text-ink-muted">{r.note}</p>}
                          </td>
                          <td className={`${td} whitespace-nowrap text-ink tabular-nums`}>
                            {r.referrerCredits || r.referredCredits ? (
                              <>
                                <p>Referrer +{r.referrerCredits}</p>
                                <p className="text-xs text-ink-muted">
                                  New customer +{r.referredCredits}
                                </p>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={`${td} text-right`}>
                            {REVERSIBLE.includes(r.status) && (
                              <button
                                type="button"
                                onClick={() => setReversing(r)}
                                className={dangerButton}
                              >
                                {r.status === "pending" ? "Cancel" : "Reverse"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination {...pagination.props} />
              </>
            )}
          </>
        )}
      </main>

      <ConfirmDialog
        open={!!reversing}
        title={reversing?.status === "pending" ? "Cancel this referral?" : "Reverse this referral?"}
        message={
          reversing?.status === "pending" ? (
            <>
              {reversing.referred.name} hasn&apos;t paid yet. Cancelling means neither they nor{" "}
              {reversing.referrer.name} get bonus credits when they do. This can&apos;t be undone.
            </>
          ) : (
            <>
              The bonus credits are taken back from {reversing?.referrer.name} and{" "}
              {reversing?.referred.name}, as far as they haven&apos;t been spent yet. This
              can&apos;t be undone.
            </>
          )
        }
        confirmLabel={reversing?.status === "pending" ? "Cancel referral" : "Reverse referral"}
        cancelLabel="Keep it"
        loading={busy}
        onConfirm={reverse}
        onCancel={() => setReversing(null)}
      />
    </div>
  );
}
