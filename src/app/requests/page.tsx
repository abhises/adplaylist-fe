"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AdCard from "@/components/AdCard";
import Spinner from "@/components/Spinner";
import {
  EmptyState,
  FilterTiles,
  StatusTag,
  editButton,
  headRow,
  row,
  snCell,
  tableCard,
  td,
  th,
} from "@/components/DataTable";
import { api, ApiError, type CreativeRequest } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/AuthProvider";
import UpgradePrompt, { type UpgradeReason } from "@/components/UpgradePrompt";
import { can } from "@/lib/plans";
import { useToast } from "@/lib/ToastProvider";
import { useNotifications } from "@/lib/NotificationsProvider";

// Kept in sync with the backend's multer fileFilter in adplaylist-be/src/routes/uploads.ts
const SUPPORTED_ATTACHMENT_TYPES =
  /^(image\/(png|jpe?g|webp|gif|svg\+xml)|application\/pdf|application\/zip|application\/x-zip-compressed)$/;
const SUPPORTED_ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.zip";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type AttachmentKind = "image" | "pdf" | "other";

function attachmentKind(nameOrUrl: string | undefined): AttachmentKind {
  const ext = (nameOrUrl ?? "").split(".").pop()?.toLowerCase();
  if (ext && ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
    return "image";
  }
  if (ext === "pdf") return "pdf";
  return "other";
}

const TABS = ["Open", "Delivered", "Declined"] as const;

const SIZE_NEEDED_OPTIONS = [
  "1080 x 1080 — Feed",
  "1080 x 1920 — Story",
  "300 x 250 — Display",
  "728 x 90 — Leaderboard",
  "970 x 250 — Billboard",
  "16:9 — Video",
  "All standard sizes",
];

function shortDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function AttachmentPreview({ url, name }: { url: string; name?: string }) {
  const kind = attachmentKind(name ?? url);
  const displayName = name ?? url.split("/").pop() ?? "attachment";

  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-ink">{displayName}</p>
        <a suppressHydrationWarning
          href={url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm text-brand hover:underline"
        >
          {kind === "other" ? "Download" : "Open in new tab"}
        </a>
      </div>

      {kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={displayName}
          className="mt-2 max-h-72 w-full border border-border bg-surface-2 object-contain"
        />
      )}

      {kind === "pdf" && (
        <iframe
          src={url}
          title={displayName}
          className="mt-2 h-[420px] w-full border border-border"
        />
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </p>
      <div className="mt-0.5 text-sm text-ink">{children}</div>
    </div>
  );
}

// Requests are promised within 3 working days.
const TURNAROUND_DAYS = 3;

function addWorkingDays(from: Date, days: number) {
  const date = new Date(from);
  let left = days;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) left--;
  }
  return date;
}

function longDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "in 3 days", "today", "2 days overdue" for a "needed by" date.
function dueIn(iso: string) {
  const day = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / day);
  if (days === 0) return "due today";
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`;
  return `${-days} day${days === -1 ? "" : "s"} overdue`;
}

// Where a request is: sent → being worked on → delivered (or declined).
function ProgressSteps({ status }: { status: string }) {
  const declined = status === "Declined";
  const current =
    status === "Delivered" || declined ? 2 : status === "In design" || status === "In review" ? 1 : 0;
  const steps = ["Sent", "In progress", declined ? "Declined" : "Delivered"];
  return (
    <ol className="flex items-center">
      {steps.map((step, i) => {
        const done = i <= current;
        const bad = declined && i === 2;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <span className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  bad
                    ? "bg-brand text-brand-foreground"
                    : done
                      ? "bg-emerald-600 text-white"
                      : "border border-ink/25 text-ink-muted"
                }`}
              >
                {bad ? "✕" : done ? "✓" : i + 1}
              </span>
              <span className={`text-[11px] whitespace-nowrap ${done ? "font-semibold text-ink" : "text-ink-muted"}`}>
                {step}
              </span>
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={`mx-2 mb-5 h-0.5 flex-1 ${i < current ? (declined && i === 1 ? "bg-brand/60" : "bg-emerald-600") : "bg-ink/15"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function RequestsPage() {
  return (
    <Suspense>
      <Requests />
    </Suspense>
  );
}

function Requests() {
  const { user, ready } = useRequireAuth();
  const { refresh } = useAuth();
  const { onNotification } = useNotifications();
  const toast = useToast();
  const [upgrade, setUpgrade] = useState<UpgradeReason | null>(null);
  // A notification links to ?tab=Delivered (or Declined); clicking a tab
  // overrides it.
  const tabParam = useSearchParams().get("tab");
  const [chosenTab, setTab] = useState<(typeof TABS)[number] | null>(null);
  const tab = chosenTab ?? TABS.find((t) => t === tabParam) ?? "Open";
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentSize, setAttachmentSize] = useState<number | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<CreativeRequest | null>(null);

  useEffect(() => {
    if (!viewingRequest) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewingRequest(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewingRequest]);

  useEffect(() => {
    if (!user) return;
    api
      .getRequests()
      .then(({ requests }) => setRequests(requests))
      .finally(() => setLoading(false));
  }, [user]);

  // When a request is delivered or declined, show it straight away. A
  // decline refunds the credit, so the balance is reloaded too.
  useEffect(
    () =>
      onNotification((n) => {
        if (n.type !== "request.delivered" && n.type !== "request.declined") return;
        api.getRequests().then(({ requests }) => setRequests(requests)).catch(() => {});
        if (n.type === "request.declined") refresh();
      }),
    [onNotification, refresh]
  );

  const grouped = {
    Open: requests.filter(
      (r) => r.status !== "Delivered" && r.status !== "Declined"
    ),
    Delivered: requests.filter((r) => r.status === "Delivered"),
    Declined: requests.filter((r) => r.status === "Declined"),
  };

  async function handleAttachment(file: File | undefined) {
    if (!file) return;
    if (!SUPPORTED_ATTACHMENT_TYPES.test(file.type)) {
      setUploadError("Unsupported format. Use PDF, PNG, JPG or ZIP.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setUploadError("That file is over the 25 MB limit.");
      return;
    }
    setUploadError(null);
    setAttachmentName(file.name);
    setAttachmentSize(file.size);
    if (attachmentKind(file.name) === "image") {
      setAttachmentPreview(URL.createObjectURL(file));
    }
    setUploading(true);
    try {
      const uploaded = await api.uploadFile(file);
      setAttachmentUrl(uploaded.url);
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : "Couldn't upload that file."
      );
      setAttachmentName(null);
      setAttachmentSize(null);
      setAttachmentPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function handleAttachmentDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleAttachment(e.dataTransfer.files?.[0]);
  }

  function clearAttachment() {
    setAttachmentName(null);
    setAttachmentSize(null);
    setAttachmentUrl(null);
    setAttachmentPreview(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Locked on Starter or an expired plan, and when the credits run out.
    if (!can(user, "requests")) return setUpgrade("requests");
    if (user?.account && user.account.credits < 1) return setUpgrade("outOfCredits");
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setSubmitting(true);
    setSubmitted(false);
    setSubmitError(null);
    try {
      const { request } = await api.createRequest({
        title: String(form.get("title")),
        sizeNeeded: String(form.get("sizeNeeded") || "") || undefined,
        neededBy: String(form.get("neededBy") || "") || undefined,
        notes: String(form.get("notes") || "") || undefined,
        attachmentUrl: attachmentUrl ?? undefined,
        attachmentName: attachmentName ?? undefined,
      });
      setRequests((prev) => [request, ...prev]);
      setSubmitted(true);
      toast.success("Request submitted. Our team will pick it up shortly.");
      // One credit was spent; update the balance shown.
      if (user?.account) refresh();
      formEl.reset();
      clearAttachment();
      setTab("Open");
    } catch (err) {
      if (err instanceof ApiError && err.upgrade) {
        setUpgrade(err.outOfCredits ? "outOfCredits" : "requests");
        refresh();
      } else {
        setSubmitError(
          err instanceof ApiError ? err.message : "Something went wrong."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 px-4 py-7 sm:px-8">
          <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
            Requests
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            Ask the creative team for a size, a market or a brand-new ad.
            Average turnaround 3 working days.
          </p>

          <FilterTiles
            className="mt-5 grid-cols-3"
            items={TABS.map((t) => ({ key: t, label: t, count: grouped[t].length }))}
            active={tab}
            onSelect={setTab}
          />

          {loading && (
            <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
              <Spinner />
              Loading requests…
            </div>
          )}

          {!loading && tab === "Open" && (
            <div className="mt-4">
              {grouped.Open.length > 0 ? (
                <div className={tableCard}>
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className={headRow}>
                        {["S.N.", "Request", "Type", "Needed by", "Status", ""].map((h) => (
                          <th key={h} className={th}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.Open.map((req, i) => (
                        <tr key={req.id} className={row}>
                          <td className={snCell}>{i + 1}</td>
                          <td className={td}>
                            <p className="font-semibold text-ink">
                              {req.title}
                              {req.attachmentUrl && (
                                <a
                                  suppressHydrationWarning
                                  href={req.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="View attachment"
                                  className="ml-1.5 inline-block align-middle text-ink-muted hover:text-brand"
                                >
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21.4 11.1 12 20.5a5 5 0 0 1-7-7l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />
                                  </svg>
                                </a>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              Raised by {user.fullName} &middot; {shortDate(req.createdAt)}
                            </p>
                          </td>
                          <td className={`${td} whitespace-nowrap text-ink-muted`}>{req.type}</td>
                          <td className={`${td} whitespace-nowrap text-ink`}>{shortDate(req.neededBy)}</td>
                          <td className={td}>
                            <StatusTag status={req.status} />
                          </td>
                          <td className={`${td} text-right`}>
                            <button type="button" onClick={() => setViewingRequest(req)} className={editButton}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>No open requests to show yet.</EmptyState>
              )}
            </div>
          )}

          {!loading && tab === "Delivered" && (
            grouped.Delivered.length > 0 ? (
              <>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {grouped.Delivered.map((req) =>
                    req.ad ? (
                      <div
                        key={req.id}
                        className="flex flex-col gap-3 border border-border p-3.5"
                      >
                        <AdCard ad={req.ad} />
                        <p className="text-xs text-ink-muted">
                          Delivered {shortDate(req.createdAt)}
                        </p>
                        <div className="mt-auto grid grid-cols-2 gap-2">
                          <a suppressHydrationWarning
                            href={`/ads/${req.ad.id}`}
                            className="border border-border px-2.5 py-1.5 text-center text-sm font-bold text-ink hover:bg-surface-2"
                          >
                            Open ad
                          </a>
                          <button
                            type="button"
                            onClick={() => setViewingRequest(req)}
                            className="border border-border px-2.5 py-1.5 text-sm font-bold text-ink hover:bg-surface-2"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={req.id}
                        className="flex flex-col gap-3 border border-border p-3.5"
                      >
                        <div className="flex aspect-square flex-col justify-between bg-brand p-4 text-brand-foreground">
                          <span className="text-[10px] tracking-[0.14em] uppercase opacity-70">
                            {req.type}
                          </span>
                          <span className="text-xl leading-tight font-extrabold">
                            {req.title}
                          </span>
                        </div>
                        <p className="text-sm leading-tight font-semibold text-ink">
                          {req.title}
                        </p>
                        <p className="text-xs text-ink-muted">
                          Delivered {shortDate(req.createdAt)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setViewingRequest(req)}
                          className="mt-auto border border-border px-2.5 py-1.5 text-sm font-bold text-ink hover:bg-surface-2"
                        >
                          Details
                        </button>
                      </div>
                    )
                  )}
                </div>
                <p className="mt-3.5 text-xs text-ink-muted">
                  Showing {grouped.Delivered.length} of {grouped.Delivered.length}
                </p>
              </>
            ) : (
              <p className="mt-10 text-sm text-ink-muted">
                No delivered requests to show yet. Finished ads land here — and in
                your library — automatically.
              </p>
            )
          )}

          {!loading && tab === "Declined" && (
            <div className="mt-4">
              {grouped.Declined.length > 0 ? (
                <div className={tableCard}>
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className={headRow}>
                        {["S.N.", "Request", "Type", "Reason", "Status", ""].map((h) => (
                          <th key={h} className={th}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.Declined.map((req, i) => (
                        <tr key={req.id} className={row}>
                          <td className={snCell}>{i + 1}</td>
                          <td className={td}>
                            <p className="font-semibold text-ink">{req.title}</p>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              Raised by {user.fullName} &middot; {shortDate(req.createdAt)}
                            </p>
                          </td>
                          <td className={`${td} whitespace-nowrap text-ink-muted`}>{req.type}</td>
                          <td className={`${td} max-w-[320px] leading-snug text-ink-muted`}>
                            {req.reason ?? "No reason given"}
                          </td>
                          <td className={td}>
                            <StatusTag status="Declined" />
                          </td>
                          <td className={`${td} text-right`}>
                            <button type="button" onClick={() => setViewingRequest(req)} className={editButton}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>No declined requests to show yet.</EmptyState>
              )}
            </div>
          )}
        </div>

        <aside className="border-t border-ink/15 px-6 py-7 lg:border-t-0 lg:border-l-2 lg:border-ink/15">
          <p className="text-[11px] tracking-[0.12em] text-ink-muted uppercase">
            New request
          </p>
          <h2 className="mt-1.5 text-xl leading-tight font-extrabold tracking-[-0.01em] text-ink">
            Tell us what you need
          </h2>
          {user.account && (
            <p className="mt-1.5 text-xs text-ink-muted">
              {can(user, "requests")
                ? `Uses 1 credit · ${user.account.credits} left`
                : "Requests are included on Pro and Agency."}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
                {SIZE_NEEDED_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
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
              <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(e) => handleAttachment(e.target.files?.[0])}
              />
              {attachmentName ? (
                <div className="flex items-center gap-3 border border-border bg-surface p-4">
                  {attachmentPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachmentPreview}
                      alt=""
                      className="h-10 w-10 shrink-0 border border-border object-cover"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="shrink-0 text-ink-muted"
                    >
                      <path d="M21.4 11.1 12 20.5a5 5 0 0 1-7-7l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />
                    </svg>
                  )}
                  <div className="min-w-0 flex-1 text-[13px] leading-snug">
                    <p className="truncate text-ink">{attachmentName}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {uploading
                        ? "Uploading…"
                        : attachmentSize !== null
                          ? formatBytes(attachmentSize)
                          : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="shrink-0 text-xs font-bold text-ink hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleAttachmentDrop}
                  className={`flex items-center gap-3 border border-dashed p-4 ${
                    dragOver ? "border-brand bg-brand/5" : "border-ink/30 bg-surface"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="shrink-0 text-ink-muted"
                  >
                    <path d="M21.4 11.1 12 20.5a5 5 0 0 1-7-7l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />
                  </svg>
                  <div className="min-w-0 text-[13px] leading-snug">
                    <p className="text-ink">Drop a brief, reference or logo here</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      PDF, PNG, JPG or ZIP &middot; up to 25 MB
                    </p>
                  </div>
                </div>
              )}
              {uploadError && (
                <p className="mt-1 text-xs text-brand">{uploadError}</p>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 border border-border px-3 py-1.5 text-sm text-ink hover:bg-surface-2"
              >
                Choose file
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex w-full items-center justify-center gap-1.5 bg-brand py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              {submitting ? "Submitting…" : "Submit request"}
            </button>
            {submitError && (
              <p className="text-sm text-brand" role="alert">
                {submitError}
              </p>
            )}
            {submitted && (
              <p className="text-sm text-ink-muted">
                Request sent to the creative team.
              </p>
            )}
            <p className="text-xs leading-relaxed text-ink-muted">
              You&apos;ll get an email when it&apos;s picked up, and the finished ad
              lands in your library automatically.
            </p>
          </form>
          <UpgradePrompt reason={upgrade} onClose={() => setUpgrade(null)} />
        </aside>
      </main>

      {viewingRequest && (() => {
        const r = viewingRequest;
        const finished = r.status === "Delivered" || r.status === "Declined";
        const expected = addWorkingDays(new Date(r.createdAt), TURNAROUND_DAYS);
        return (
          <div
            onClick={() => setViewingRequest(null)}
            className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="request-detail-title"
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-[640px] flex-col border border-ink/15 bg-card shadow-lg"
            >
              <div className="flex items-start justify-between gap-4 border-b border-ink/10 p-6 pb-5">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-ink-muted">Request #{r.id}</p>
                  <h2 id="request-detail-title" className="mt-1 text-xl leading-tight font-extrabold text-ink">
                    {r.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusTag status={r.status} />
                    <span className="bg-ink/[0.07] px-2 py-0.5 text-xs font-semibold text-ink">{r.type}</span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingRequest(null)}
                  aria-label="Close"
                  className="shrink-0 text-2xl leading-none text-ink-muted hover:text-ink"
                >
                  &times;
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <ProgressSteps status={r.status} />

                <section className="mt-6 grid grid-cols-1 gap-4 border-t border-ink/10 pt-5 sm:grid-cols-2">
                  <DetailRow label="Sent">{longDateTime(r.createdAt)}</DetailRow>
                  <DetailRow label="Raised by">{user.fullName}</DetailRow>
                  <DetailRow label="Needed by">
                    {r.neededBy ? (
                      <>
                        {shortDate(r.neededBy)}
                        {!finished && (
                          <span
                            className={`ml-1.5 text-xs ${
                              dueIn(r.neededBy).includes("overdue") ? "text-brand" : "text-ink-muted"
                            }`}
                          >
                            ({dueIn(r.neededBy)})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-muted">No deadline</span>
                    )}
                  </DetailRow>
                  <DetailRow label={finished ? "Turnaround" : "Expected by"}>
                    {finished ? (
                      <span className="text-ink-muted">{r.status === "Delivered" ? "Delivered" : "Closed"}</span>
                    ) : (
                      <>
                        {expected.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        <span className="ml-1.5 text-xs text-ink-muted">({TURNAROUND_DAYS} working days)</span>
                      </>
                    )}
                  </DetailRow>
                  <DetailRow label="Sizes needed">{r.sizeNeeded ?? "Any size"}</DetailRow>
                  <DetailRow label="Cost">
                    {r.creditCharged ? (
                      r.status === "Declined" ? (
                        <>
                          1 credit <span className="text-xs text-emerald-700">· refunded</span>
                        </>
                      ) : (
                        "1 credit"
                      )
                    ) : (
                      <span className="text-ink-muted">No charge</span>
                    )}
                  </DetailRow>
                </section>

                {r.ad && (
                  <section className="mt-5 border-t border-ink/10 pt-5">
                    <p className="text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                      {r.status === "Delivered" ? "Delivered ad" : "Ad"}
                    </p>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="w-28 shrink-0">
                        <AdCard ad={r.ad} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-ink-muted">
                          {[r.ad.format, r.ad.category].filter(Boolean).join(" · ")}
                        </p>
                        <a
                          suppressHydrationWarning
                          href={`/ads/${r.ad.id}`}
                          className={`mt-2 inline-block ${editButton}`}
                        >
                          Open ad
                        </a>
                      </div>
                    </div>
                  </section>
                )}

                <section className="mt-5 border-t border-ink/10 pt-5">
                  <p className="text-[11px] tracking-[0.1em] text-ink-muted uppercase">Notes for the creative team</p>
                  {r.notes ? (
                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-ink">{r.notes}</p>
                  ) : (
                    <p className="mt-1.5 text-sm text-ink-muted">No notes added.</p>
                  )}
                </section>

                {r.reason && (
                  <section className="mt-5 border-l-[3px] border-brand bg-brand/5 p-4">
                    <p className="text-[11px] tracking-[0.1em] text-brand uppercase">Why it was declined</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink">{r.reason}</p>
                  </section>
                )}

                <section className="mt-5 border-t border-ink/10 pt-5">
                  <p className="text-[11px] tracking-[0.1em] text-ink-muted uppercase">Attachment</p>
                  {r.attachmentUrl ? (
                    <AttachmentPreview url={r.attachmentUrl} name={r.attachmentName} />
                  ) : (
                    <p className="mt-1.5 text-sm text-ink-muted">None attached.</p>
                  )}
                </section>
              </div>

              <div className="flex justify-end border-t border-ink/10 px-6 py-4">
                <button
                  onClick={() => setViewingRequest(null)}
                  className="border border-ink/20 px-4 py-2 text-sm font-bold text-ink hover:border-ink/60"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
