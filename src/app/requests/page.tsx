"use client";

import { useEffect, useState, type FormEvent } from "react";
import AppHeader from "@/components/AppHeader";
import { api, type CreativeRequest } from "@/lib/api";
import { useRequireAuth } from "@/lib/AuthProvider";

const TABS = ["Open", "Delivered", "Declined"] as const;

const STATUS_STYLE: Record<string, string> = {
  Open: "bg-surface-2 text-ink",
  "In design": "bg-surface-2 text-ink",
  "Awaiting brief": "bg-surface-2 text-ink",
  "In review": "border border-brand text-brand",
  Delivered: "bg-surface-2 text-ink",
  Declined: "border border-ink/30 text-ink-muted",
};

function shortDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function RequestsPage() {
  const { user, ready } = useRequireAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Open");
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .getRequests()
      .then(({ requests }) => setRequests(requests))
      .finally(() => setLoading(false));
  }, [user]);

  const grouped = {
    Open: requests.filter(
      (r) => r.status !== "Delivered" && r.status !== "Declined"
    ),
    Delivered: requests.filter((r) => r.status === "Delivered"),
    Declined: requests.filter((r) => r.status === "Declined"),
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setSubmitted(false);
    try {
      const { request } = await api.createRequest({
        title: String(form.get("title")),
        sizeNeeded: String(form.get("sizeNeeded") || "") || undefined,
        neededBy: String(form.get("neededBy") || "") || undefined,
        notes: String(form.get("notes") || "") || undefined,
      });
      setRequests((prev) => [request, ...prev]);
      setSubmitted(true);
      e.currentTarget.reset();
      setTab("Open");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_420px]">
        <div className="border-r border-ink/15 px-10 py-8">
          <h1 className="text-3xl font-extrabold text-ink">Requests</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Ask the creative team for a size, a market or a brand-new ad.
            Average turnaround 3 working days.
          </p>

          <div className="mt-6 flex w-fit border border-ink/15">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-bold ${
                  tab === t ? "bg-ink text-surface" : "bg-surface text-ink"
                }`}
              >
                {t} &middot; {grouped[t].length}
              </button>
            ))}
          </div>

          {loading && (
            <p className="mt-8 text-sm text-ink-muted">Loading requests…</p>
          )}

          {!loading && grouped[tab].length > 0 ? (
            <div className="mt-8">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-ink/15 pb-2 text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                <span>Request</span>
                <span>Type</span>
                <span>Needed by</span>
                <span>Status</span>
              </div>
              {grouped[tab].map((req) => (
                <div
                  key={req.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b border-ink/10 py-4"
                >
                  <div>
                    <p className="text-sm font-bold text-ink">{req.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Raised by {user.fullName} &middot;{" "}
                      {shortDate(req.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm text-ink">{req.type}</span>
                  <span className="text-sm text-ink">
                    {shortDate(req.neededBy)}
                  </span>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-1 text-xs font-medium ${
                        STATUS_STYLE[req.status] ?? "bg-surface-2 text-ink"
                      }`}
                    >
                      {req.status}
                    </span>
                    <button className="text-sm font-bold text-brand">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loading && (
              <p className="mt-10 text-sm text-ink-muted">
                No {tab.toLowerCase()} requests to show yet.
              </p>
            )
          )}
        </div>

        <div className="px-10 py-8">
          <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
            New request
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-ink">
            Tell us what you need
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                Title
              </label>
              <input
                type="text"
                name="title"
                placeholder="Short name for this request"
                required
                className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
              />
            </div>
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                Sizes needed
              </label>
              <select
                name="sizeNeeded"
                className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
              >
                <option>1080 x 1080 — Feed</option>
                <option>1080 x 1350 — Feed</option>
                <option>1080 x 1920 — Stories / Reels</option>
                <option>728 x 90 — Leaderboard</option>
              </select>
            </div>
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                Needed by
              </label>
              <input
                type="date"
                name="neededBy"
                className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
              />
            </div>
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                Notes for the creative team
              </label>
              <textarea
                name="notes"
                rows={4}
                placeholder="Describe what you want as precisely as possible — where it runs, what must change, why. Add links to references or examples."
                className="w-full resize-none border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
              />
            </div>
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                Attach a file
              </label>
              <div className="flex h-24 items-center justify-center border border-dashed border-border text-sm text-ink-muted">
                Drop a file here
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
            {submitted && (
              <p className="text-sm text-ink-muted">
                Request sent to the creative team.
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
