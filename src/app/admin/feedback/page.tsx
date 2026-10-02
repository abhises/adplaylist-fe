"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import Spinner from "@/components/Spinner";
import { api, ApiError, type Feedback } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

type Filter = "open" | "resolved" | "all";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// The path is all that's useful here; the origin is always our own site.
function pagePath(url: string) {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

export default function AdminFeedbackPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() =>
      api
        .getFeedback()
        .then((res) => setFeedback(res.feedback))
        .catch(() => setError("Couldn't load feedback."))
    );
  }, [user]);

  function message(err: unknown, fallback: string) {
    return err instanceof ApiError ? err.message : fallback;
  }

  async function toggleResolved(item: Feedback) {
    setBusyId(item.id);
    setError(null);
    try {
      const res = await api.setFeedbackResolved(item.id, !item.resolved);
      setFeedback((list) =>
        list ? list.map((f) => (f.id === item.id ? res.feedback : f)) : list
      );
    } catch (err) {
      setError(message(err, "Couldn't update that feedback."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    const id = deleteTarget.id;
    try {
      await api.deleteFeedback(id);
      setFeedback((list) => (list ? list.filter((f) => f.id !== id) : list));
    } catch (err) {
      setError(message(err, "Couldn't delete that feedback."));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (!ready || !user) return null;

  const openCount = feedback?.filter((f) => !f.resolved).length ?? 0;
  const resolvedCount = feedback?.filter((f) => f.resolved).length ?? 0;
  const shown =
    feedback?.filter((f) =>
      filter === "all" ? true : filter === "open" ? !f.resolved : f.resolved
    ) ?? [];

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "open", label: "Open", count: openCount },
    { value: "resolved", label: "Resolved", count: resolvedCount },
    { value: "all", label: "All", count: feedback?.length ?? 0 },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
          Admin
        </p>
        <h1 className="text-3xl font-extrabold text-ink">Feedback</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Notes sent from the Feedback tab on the library. Mark one resolved
          once it&rsquo;s been dealt with.
        </p>

        <div className="mt-6 flex gap-6 border-b border-ink/15">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`-mb-px border-b-2 pb-2 text-sm ${
                filter === tab.value
                  ? "border-brand font-medium text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-ink-muted">{tab.count}</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-sm text-brand" role="alert">
            {error}
          </p>
        )}

        {feedback === null && !error ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading…
          </div>
        ) : shown.length === 0 ? (
          <p className="mt-8 text-sm text-ink-muted">
            {filter === "open" ? "No open feedback." : "Nothing here yet."}
          </p>
        ) : (
          <ul className="mt-2 max-w-3xl">
            {shown.map((item) => {
              const replyTo = item.email ?? item.sender?.email;
              return (
                <li
                  key={item.id}
                  className={`border-b border-ink/10 py-5 ${item.resolved ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span className="font-bold text-ink">
                      {item.sender?.fullName ?? "Deleted user"}
                    </span>
                    {item.sender && (
                      <span className="text-xs text-ink-muted capitalize">
                        {item.sender.role}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-ink-muted">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm whitespace-pre-wrap text-ink">
                    {item.message}
                  </p>

                  {item.screenshotUrl && (
                    <a suppressHydrationWarning
                      href={item.screenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block w-fit border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.screenshotUrl}
                        alt={item.screenshotName ?? "Screenshot"}
                        className="max-h-48 max-w-full object-contain"
                      />
                    </a>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                    {replyTo && (
                      <a suppressHydrationWarning href={`mailto:${replyTo}`} className="text-brand hover:underline">
                        Reply to {replyTo}
                      </a>
                    )}
                    {item.pageUrl && <span>Sent from {pagePath(item.pageUrl)}</span>}
                    <span className="ml-auto flex gap-4">
                      <button
                        type="button"
                        onClick={() => toggleResolved(item)}
                        disabled={busyId === item.id}
                        className="text-sm font-medium text-brand disabled:opacity-60"
                      >
                        {item.resolved ? "Reopen" : "Mark resolved"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="text-sm text-ink-muted hover:text-brand"
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete feedback"
        message={
          deleteTarget && (
            <>
              Delete this feedback from{" "}
              <strong className="text-ink">
                {deleteTarget.sender?.fullName ?? "a deleted user"}
              </strong>
              ? This can&rsquo;t be undone.
            </>
          )
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
