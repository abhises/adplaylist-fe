"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import Pagination, { usePagination } from "@/components/Pagination";
import Spinner from "@/components/Spinner";
import { api, type CancellationFeedback } from "@/lib/api";
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

const FILTERS = [
  { value: "all", label: "All" },
  { value: "deactivated", label: "Deleted" },
  { value: "discount", label: "Took the discount" },
  { value: "returned", label: "Rejoined" },
] as const;

const th = "py-2 pr-4 text-left text-xs font-medium tracking-[0.08em] text-ink-muted uppercase";
const td = "py-3 pr-4 align-top text-sm";

// Every pass through "Delete account" on the profile page: who, the
// discount they were offered, whether they took it, and (when they went
// ahead) why. Deleted accounts are deactivated, not erased.
export default function AdminCancellationsPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const [rows, setRows] = useState<CancellationFeedback[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");

  useEffect(() => {
    if (!user) return;
    api
      .getCancellationFeedback()
      .then(({ feedback }) => setRows(feedback))
      .catch(() => {
        setError("Couldn't load cancellations.");
        setRows([]);
      });
  }, [user]);

  const shown = (rows ?? []).filter((r) => filter === "all" || r.outcome === filter);
  const pagination = usePagination(shown.length, "adplaylist_cancellations_page_size");
  const deleted = (rows ?? []).filter((r) => r.outcome === "deactivated");
  const reasonCounts = new Map<string, number>();
  for (const r of deleted) {
    if (r.reason) reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);
  }

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-10">
        <h1 className="text-3xl font-extrabold text-ink">Cancellations</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Answers from &ldquo;Delete account&rdquo; on the profile page. Deleted accounts are
          deactivated: their data is kept, and signing in again reactivates them (an owner
          then has to subscribe, with no new free trial).
        </p>

        {rows === null ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading…
          </div>
        ) : (
          <>
            {error && <p className="mt-6 text-sm text-brand">{error}</p>}

            {reasonCounts.size > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {[...reasonCounts.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <span key={reason} className="border border-border px-3 py-1.5 text-xs text-ink">
                      {reason} <span className="font-bold tabular-nums">{count}</span>
                    </span>
                  ))}
              </div>
            )}

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
                  <table className="w-full min-w-[760px] border-t border-ink/15">
                    <thead>
                      <tr className="border-b border-ink/15">
                        <th className={th}>Date</th>
                        <th className={th}>Who</th>
                        <th className={th}>Plan</th>
                        <th className={th}>Offer</th>
                        <th className={th}>Outcome</th>
                        <th className={th}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.slice(pagination.start, pagination.end).map((r) => (
                        <tr key={r.id} className="border-b border-ink/10">
                          <td className={`${td} whitespace-nowrap text-ink-muted`}>
                            {when(r.createdAt)}
                          </td>
                          <td className={td}>
                            <p className="font-bold text-ink">{r.userName}</p>
                            <p className="text-xs text-ink-muted">{r.userEmail}</p>
                            {r.accountName && r.accountName !== r.userName && (
                              <p className="text-xs text-ink-muted">{r.accountName}</p>
                            )}
                          </td>
                          <td className={`${td} text-ink capitalize`}>{r.plan ?? "—"}</td>
                          <td className={`${td} whitespace-nowrap text-ink`}>
                            {r.offerPercent ? `${r.offerPercent}% off` : "—"}
                          </td>
                          <td className={`${td} whitespace-nowrap`}>
                            {r.outcome === "discount" ? (
                              <span className="bg-emerald-600/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                Stayed · discount
                              </span>
                            ) : r.outcome === "returned" ? (
                              <span className="bg-ink px-2 py-0.5 text-xs font-bold text-surface">
                                Rejoined
                              </span>
                            ) : (
                              <span className="bg-brand px-2 py-0.5 text-xs font-bold text-brand-foreground">
                                Deleted
                              </span>
                            )}
                          </td>
                          <td className={`${td} max-w-sm text-ink`}>
                            {r.reason ?? "—"}
                            {r.details && (
                              <p className="mt-1 text-xs whitespace-pre-line text-ink-muted">
                                &ldquo;{r.details}&rdquo;
                              </p>
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
    </div>
  );
}
