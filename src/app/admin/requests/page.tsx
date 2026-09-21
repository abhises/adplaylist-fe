"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import Modal from "@/components/Modal";
import { api, ApiError, type Ad, type CreativeRequest } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

const TABS = ["Open", "Delivered", "Declined"] as const;

const STATUS_STYLE: Record<string, string> = {
  Open: "bg-[#f8f4f4] text-[#444141]",
  "In design": "bg-[#fff2ef] text-[#7c1405]",
  "Awaiting brief": "bg-[#f8f4f4] text-[#444141]",
  "In review": "border border-brand text-brand",
  Delivered: "bg-[#f8f4f4] text-[#444141]",
};

function shortDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function DeliverModal({
  request,
  onClose,
  onDelivered,
}: {
  request: CreativeRequest;
  onClose: () => void;
  onDelivered: (request: CreativeRequest) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Ad[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Ad | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      api
        .getAds(query ? { q: query } : undefined)
        .then(({ ads }) => {
          if (!cancelled) setResults(ads.slice(0, 8));
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const { request: updated } = await api.deliverRequest(
        request.id,
        selected.id
      );
      onDelivered(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't link that ad.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-lg font-extrabold text-ink">Mark as delivered</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Link the finished ad to &ldquo;{request.title}&rdquo;.
      </p>

      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
        }}
        placeholder="Search ads by title…"
        className="mt-4 w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
      />

      <div className="mt-2 max-h-56 divide-y divide-border overflow-y-auto border border-border">
        {searching && (
          <p className="p-3 text-sm text-ink-muted">Searching…</p>
        )}
        {!searching && results.length === 0 && (
          <p className="p-3 text-sm text-ink-muted">No ads found.</p>
        )}
        {!searching &&
          results.map((ad) => (
            <button
              key={ad.id}
              type="button"
              onClick={() => setSelected(ad)}
              className={`flex w-full items-center justify-between gap-3 p-2.5 text-left text-sm hover:bg-surface-2 ${
                selected?.id === ad.id ? "bg-brand/10" : ""
              }`}
            >
              <span className="min-w-0 truncate text-ink">
                {ad.title} — {ad.format}
              </span>
              {selected?.id === ad.id && (
                <span className="shrink-0 text-xs font-bold text-brand">
                  Selected
                </span>
              )}
            </button>
          ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-brand" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="border border-border px-4 py-2 text-sm font-bold text-ink hover:bg-surface-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selected || submitting}
          className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
        >
          {submitting ? "Linking…" : "Mark delivered"}
        </button>
      </div>
    </Modal>
  );
}

function DeclineModal({
  request,
  onClose,
  onDeclined,
}: {
  request: CreativeRequest;
  onClose: () => void;
  onDeclined: (request: CreativeRequest) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError("Give the client a reason.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { request: updated } = await api.declineRequest(
        request.id,
        reason.trim()
      );
      onDeclined(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't decline that request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-lg font-extrabold text-ink">Decline request</h2>
      <p className="mt-1 text-sm text-ink-muted">
        &ldquo;{request.title}&rdquo; will move to the client&rsquo;s Declined tab
        with this reason.
      </p>

      <textarea
        autoFocus
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why can't this be fulfilled?"
        className="mt-4 w-full resize-none border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
      />

      {error && (
        <p className="mt-2 text-sm text-brand" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="border border-border px-4 py-2 text-sm font-bold text-ink hover:bg-surface-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
        >
          {submitting ? "Declining…" : "Decline"}
        </button>
      </div>
    </Modal>
  );
}

export default function RequestsQueuePage() {
  const { user, ready } = useRequireRole(["designer", "admin"]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Open");
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [delivering, setDelivering] = useState<CreativeRequest | null>(null);
  const [declining, setDeclining] = useState<CreativeRequest | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .getRequestsQueue()
      .then(({ requests }) => setRequests(requests))
      .catch(() => setLoadError("Couldn't load requests."))
      .finally(() => setLoading(false));
  }, [user]);

  function replaceRequest(updated: CreativeRequest) {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  if (!ready || !user) return null;

  const grouped = {
    Open: requests.filter((r) => r.status !== "Delivered" && r.status !== "Declined"),
    Delivered: requests.filter((r) => r.status === "Delivered"),
    Declined: requests.filter((r) => r.status === "Declined"),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
          Admin
        </p>
        <h1 className="text-3xl font-extrabold text-ink">Requests queue</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Every creative request raised across all clients. Deliver by linking a
          finished ad, or decline with a reason.
        </p>

        <div className="mt-5 flex max-w-[420px] border border-border">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-[7px] text-left text-xs ${
                i > 0 ? "border-l border-border" : ""
              } ${
                tab === t
                  ? "bg-brand text-brand-foreground"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              {t} &middot; {grouped[t].length}
            </button>
          ))}
        </div>

        {loading && <p className="mt-8 text-sm text-ink-muted">Loading requests…</p>}
        {loadError && <p className="mt-8 text-sm text-brand">{loadError}</p>}

        {!loading && !loadError && tab === "Open" && (
          grouped.Open.length > 0 ? (
            <table className="mt-6 w-full max-w-4xl border-collapse text-sm">
              <thead>
                <tr>
                  {["Request", "Requester", "Needed by", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="border-b-2 border-border p-2 text-left text-[11px] tracking-[0.08em] text-ink-muted uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.Open.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-2/60">
                    <td className="border-b border-border p-2">
                      <p className="font-semibold text-ink">{req.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {req.sizeNeeded ?? "Any size"} &middot; {shortDate(req.createdAt)}
                      </p>
                    </td>
                    <td className="border-b border-border p-2 text-ink-muted">
                      {req.requester?.fullName ?? "—"}
                    </td>
                    <td className="border-b border-border p-2 text-ink">
                      {shortDate(req.neededBy)}
                    </td>
                    <td className="border-b border-border p-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-[3px] text-[11px] tracking-[0.02em] ${
                          STATUS_STYLE[req.status] ?? "bg-[#f8f4f4] text-[#444141]"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="border-b border-border p-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => setDelivering(req)}
                        className="text-sm text-brand hover:underline"
                      >
                        Deliver
                      </button>
                      <button
                        onClick={() => setDeclining(req)}
                        className="ml-4 text-sm text-ink hover:underline"
                      >
                        Decline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-10 text-sm text-ink-muted">No open requests.</p>
          )
        )}

        {!loading && !loadError && tab === "Delivered" && (
          grouped.Delivered.length > 0 ? (
            <table className="mt-6 w-full max-w-4xl border-collapse text-sm">
              <thead>
                <tr>
                  {["Request", "Requester", "Ad", "Delivered"].map((h) => (
                    <th
                      key={h}
                      className="border-b-2 border-border p-2 text-left text-[11px] tracking-[0.08em] text-ink-muted uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.Delivered.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-2/60">
                    <td className="border-b border-border p-2 font-semibold text-ink">
                      {req.title}
                    </td>
                    <td className="border-b border-border p-2 text-ink-muted">
                      {req.requester?.fullName ?? "—"}
                    </td>
                    <td className="border-b border-border p-2">
                      {req.ad ? (
                        <a
                          href={`/ads/${req.ad.id}`}
                          className="text-brand hover:underline"
                        >
                          {req.ad.title}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-b border-border p-2 text-ink-muted">
                      {shortDate(req.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-10 text-sm text-ink-muted">No delivered requests yet.</p>
          )
        )}

        {!loading && !loadError && tab === "Declined" && (
          grouped.Declined.length > 0 ? (
            <table className="mt-6 w-full max-w-4xl border-collapse text-sm">
              <thead>
                <tr>
                  {["Request", "Requester", "Reason"].map((h) => (
                    <th
                      key={h}
                      className="border-b-2 border-border p-2 text-left text-[11px] tracking-[0.08em] text-ink-muted uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.Declined.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-2/60">
                    <td className="border-b border-border p-2 font-semibold text-ink">
                      {req.title}
                    </td>
                    <td className="border-b border-border p-2 text-ink-muted">
                      {req.requester?.fullName ?? "—"}
                    </td>
                    <td className="border-b border-border p-2 leading-snug text-ink-muted">
                      {req.reason ?? "No reason given"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-10 text-sm text-ink-muted">No declined requests.</p>
          )
        )}
      </main>

      {delivering && (
        <DeliverModal
          request={delivering}
          onClose={() => setDelivering(null)}
          onDelivered={(updated) => {
            replaceRequest(updated);
            setDelivering(null);
          }}
        />
      )}

      {declining && (
        <DeclineModal
          request={declining}
          onClose={() => setDeclining(null)}
          onDeclined={(updated) => {
            replaceRequest(updated);
            setDeclining(null);
          }}
        />
      )}
    </div>
  );
}
