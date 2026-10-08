"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Modal from "@/components/Modal";
import Pagination, { usePagination } from "@/components/Pagination";
import Spinner from "@/components/Spinner";
import RequestDetailsModal from "@/components/RequestDetailsModal";
import {
  Avatar,
  EmptyState,
  FilterTiles,
  StatusTag,
  dangerButton,
  editButton,
  headRow,
  primaryButton,
  row,
  snCell,
  tableCard,
  td,
  th,
} from "@/components/DataTable";
import { api, ApiError, type CreativeRequest } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";
import { useNotifications } from "@/lib/NotificationsProvider";

const TABS = ["Open", "Delivered", "Declined"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  Open: "Open requests",
  Delivered: "Delivered",
  Declined: "Declined",
};

const COLUMNS: Record<Tab, string[]> = {
  Open: ["S.N.", "Request", "Requester", "Sent", "Needed by", "Status", ""],
  Delivered: ["S.N.", "Request", "Requester", "Sent", "Delivered ad", "Status", ""],
  Declined: ["S.N.", "Request", "Requester", "Sent", "Reason", "Status", ""],
};

const EMPTY: Record<Tab, string> = {
  Open: "No open requests. New ones appear here live.",
  Delivered: "No delivered requests yet.",
  Declined: "No declined requests.",
};

function shortDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function groupRequests(requests: CreativeRequest[]): Record<Tab, CreativeRequest[]> {
  return {
    Open: requests.filter((r) => r.status !== "Delivered" && r.status !== "Declined"),
    Delivered: requests.filter((r) => r.status === "Delivered"),
    Declined: requests.filter((r) => r.status === "Declined"),
  };
}

function tabOf(status: string): (typeof TABS)[number] {
  return status === "Delivered" || status === "Declined" ? status : "Open";
}

// Who sent a request: avatar, name, email and the company account they
// belong to.
function RequesterCell({ requester }: { requester: CreativeRequest["requester"] }) {
  if (!requester) return <td className={`${td} text-ink-muted`}>—</td>;
  const company = requester.company;
  return (
    <td className={td}>
      <div className="flex items-center gap-3">
        <Avatar name={requester.fullName} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{requester.fullName}</p>
          <a
            href={`mailto:${requester.email}`}
            className="block truncate text-xs text-ink-muted hover:text-ink hover:underline"
          >
            {requester.email}
          </a>
          <p className="truncate text-xs text-ink-muted">
            {company
              ? `${company.name} · ${company.plan}${company.status === "active" ? "" : ` (${company.status})`}${
                  requester.accountRole === "owner" ? " · owner" : ""
                }`
              : `Staff · ${requester.role}`}
          </p>
        </div>
      </div>
    </td>
  );
}

// The request itself: title, type, size and the ad it's about.
function RequestCell({ req }: { req: CreativeRequest }) {
  return (
    <td className={td}>
      <p className="font-semibold text-ink">{req.title}</p>
      <p className="mt-0.5 text-xs text-ink-muted">
        {req.type} &middot; {req.sizeNeeded ?? "Any size"}
      </p>
      {req.adUrl && (
        <a
          href={req.adUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={req.adUrl}
          className="mt-0.5 block max-w-[280px] truncate text-xs text-brand underline-offset-2 hover:underline"
        >
          {req.adUrl.replace(/^https?:\/\//, "")}
        </a>
      )}
    </td>
  );
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
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = url.trim();
  const validUrl = /^https?:\/\/\S+\.\S+/.test(trimmed);

  async function handleConfirm() {
    if (!validUrl) return;
    setSubmitting(true);
    setError(null);
    try {
      const { request: updated } = await api.deliverRequest(request.id, trimmed, note.trim());
      onDelivered(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't deliver that request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-lg font-extrabold text-ink">Deliver request</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Send the finished creative for &ldquo;{request.title}&rdquo; to{" "}
        {request.requester?.fullName ?? "the client"}.
      </p>

      <label className="mt-5 mb-[5px] block text-xs text-ink/70">Link to the finished ad</label>
      <input
        type="url"
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.canva.com/design/…"
        className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
      />
      <p className="mt-1 text-[11px] text-ink-muted">
        A Canva, Google Drive or Adplaylist ad link. An Adplaylist ad link also shows the ad
        as a card for the client.
      </p>

      <label className="mt-4 mb-[5px] block text-xs text-ink/70">
        Message to the client <span className="text-ink-muted">(optional)</span>
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Anything they should know: what changed, how to use it…"
        className="w-full resize-none border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
      />

      {error && (
        <p className="mt-3 text-sm text-brand" role="alert">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs text-ink-muted">
        The client gets a notification (and an email) with the link.
      </p>
      <div className="mt-3 flex justify-end gap-3">
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
          disabled={!validUrl || submitting}
          className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
        >
          {submitting ? "Delivering…" : "Deliver & notify client"}
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
  return (
    <Suspense>
      <RequestsQueue />
    </Suspense>
  );
}

function RequestsQueue() {
  const { user, ready } = useRequireRole(["designer", "admin"]);
  const { onRequest } = useNotifications();
  // Set when arriving from a notification: that request is highlighted.
  const highlightId = Number(useSearchParams().get("request")) || null;
  // Null until a tab is clicked: then it shows the highlighted request's tab.
  const [chosenTab, setTab] = useState<(typeof TABS)[number] | null>(null);
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [delivering, setDelivering] = useState<CreativeRequest | null>(null);
  const [declining, setDeclining] = useState<CreativeRequest | null>(null);
  const [viewing, setViewing] = useState<CreativeRequest | null>(null);

  // New and updated requests arrive live; new ones go on top.
  useEffect(
    () =>
      onRequest((incoming) =>
        setRequests((prev) =>
          prev.some((r) => r.id === incoming.id)
            ? prev.map((r) => (r.id === incoming.id ? incoming : r))
            : [incoming, ...prev]
        )
      ),
    [onRequest]
  );

  // Open the tab holding the highlighted request and scroll to it.
  const highlighted = requests.find((r) => r.id === highlightId);
  const highlightedTab = highlighted ? tabOf(highlighted.status) : null;
  const tab = chosenTab ?? highlightedTab ?? "Open";
  useEffect(() => {
    if (highlightedTab) {
      document.getElementById(`request-${highlightId}`)?.scrollIntoView({ block: "center" });
    }
  }, [highlightedTab, highlightId]);

  const rowClass = (id: number) =>
    id === highlightId ? "bg-brand/10 hover:bg-brand/15" : row;

  function replaceRequest(updated: CreativeRequest) {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  const grouped = groupRequests(requests);
  const pagination = usePagination(grouped[tab].length, "adplaylist_queue_page_size");

  useEffect(() => {
    if (!user) return;
    api
      .getRequestsQueue()
      .then(({ requests }) => {
        setRequests(requests);
        // Arriving from a notification: open the page that request is on.
        const target = requests.find((r) => r.id === highlightId);
        if (target) {
          const index = groupRequests(requests)[tabOf(target.status)].indexOf(target);
          pagination.setPage(Math.floor(index / pagination.props.pageSize) + 1);
        }
      })
      .catch(() => setLoadError("Couldn't load requests."))
      .finally(() => setLoading(false));
    // Only when the user loads; highlightId comes from the URL it opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-10">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
          Admin
        </p>
        <h1 className="text-3xl font-extrabold text-ink">Requests queue</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Every creative request raised across all clients, with who sent it.
          New requests appear here live. Deliver by linking a finished ad, or
          decline with a reason.
        </p>

        <FilterTiles
          className="mt-6 grid-cols-3"
          items={TABS.map((t) => ({ key: t, label: TAB_LABELS[t], count: grouped[t].length }))}
          active={tab}
          onSelect={(t) => {
            setTab(t);
            pagination.setPage(1);
          }}
        />

        {loading && (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading requests…
          </div>
        )}
        {loadError && <p className="mt-8 text-sm text-brand">{loadError}</p>}

        {!loading && !loadError && (
          <div className="mt-4">
            {grouped[tab].length === 0 ? (
              <EmptyState>{EMPTY[tab]}</EmptyState>
            ) : (
              <div className={tableCard}>
                <table className="w-full min-w-[860px] border-collapse text-sm">
                  <thead>
                    <tr className={headRow}>
                      {COLUMNS[tab].map((h) => (
                        <th key={h} className={`${th} ${h === "" ? "text-right" : ""}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[tab].slice(pagination.start, pagination.end).map((req, i) => (
                      <tr key={req.id} id={`request-${req.id}`} className={rowClass(req.id)}>
                        <td className={snCell}>{pagination.start + i + 1}</td>
                        <RequestCell req={req} />
                        <RequesterCell requester={req.requester} />
                        <td className={`${td} whitespace-nowrap text-ink-muted`}>{shortDate(req.createdAt)}</td>
                        {tab === "Open" && (
                          <>
                            <td className={`${td} whitespace-nowrap text-ink`}>{shortDate(req.neededBy)}</td>
                            <td className={td}>
                              <StatusTag status={req.status} />
                            </td>
                            <td className={`${td} text-right whitespace-nowrap`}>
                              <button type="button" onClick={() => setViewing(req)} className={`mr-2 ${editButton}`}>
                                View
                              </button>
                              <button type="button" onClick={() => setDelivering(req)} className={primaryButton}>
                                Deliver
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeclining(req)}
                                className={`ml-2 ${dangerButton}`}
                              >
                                Decline
                              </button>
                            </td>
                          </>
                        )}
                        {tab === "Delivered" && (
                          <>
                            <td className={td}>
                              {req.deliveredUrl ? (
                                <a
                                  href={req.deliveredUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={req.deliveredUrl}
                                  className="block max-w-[280px] truncate font-semibold text-brand hover:underline"
                                >
                                  {req.ad?.title ?? req.deliveredUrl.replace(/^https?:\/\//, "")}
                                </a>
                              ) : req.ad ? (
                                <a
                                  suppressHydrationWarning
                                  href={`/ads/${req.ad.id}`}
                                  className="font-semibold text-brand hover:underline"
                                >
                                  {req.ad.title}
                                </a>
                              ) : (
                                <span className="text-ink-muted">—</span>
                              )}
                            </td>
                            <td className={td}>
                              <StatusTag status="Delivered" />
                            </td>
                            <td className={`${td} text-right`}>
                              <button type="button" onClick={() => setViewing(req)} className={editButton}>
                                View
                              </button>
                            </td>
                          </>
                        )}
                        {tab === "Declined" && (
                          <>
                            <td className={`${td} max-w-[360px] leading-snug text-ink-muted`}>
                              {req.reason ?? "No reason given"}
                            </td>
                            <td className={td}>
                              <StatusTag status="Declined" />
                            </td>
                            <td className={`${td} text-right`}>
                              <button type="button" onClick={() => setViewing(req)} className={editButton}>
                                View
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {grouped[tab].length > 0 && <Pagination {...pagination.props} />}
          </div>
        )}
      </main>

      {viewing && (
        <RequestDetailsModal
          request={viewing}
          raisedBy={
            viewing.requester ? (
              <>
                {viewing.requester.fullName}
                <a
                  href={`mailto:${viewing.requester.email}`}
                  className="block text-xs text-ink-muted hover:text-ink hover:underline"
                >
                  {viewing.requester.email}
                </a>
                <span className="block text-xs text-ink-muted">
                  {viewing.requester.company
                    ? `${viewing.requester.company.name} · ${viewing.requester.company.plan}`
                    : `Staff · ${viewing.requester.role}`}
                </span>
              </>
            ) : (
              "—"
            )
          }
          onClose={() => setViewing(null)}
          actions={
            viewing.status !== "Delivered" && viewing.status !== "Declined" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDeclining(viewing);
                    setViewing(null);
                  }}
                  className="border border-brand/40 px-4 py-2 text-sm font-bold text-brand hover:bg-brand hover:text-brand-foreground"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDelivering(viewing);
                    setViewing(null);
                  }}
                  className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground hover:opacity-90"
                >
                  Deliver
                </button>
              </>
            ) : null
          }
        />
      )}

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
