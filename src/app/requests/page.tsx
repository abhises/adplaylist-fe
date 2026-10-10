"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AdCard from "@/components/AdCard";
import Spinner from "@/components/Spinner";
import RequestDetailsModal, { attachmentKind, shortDate } from "@/components/RequestDetailsModal";
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

const TABS = ["Open", "Delivered", "Declined"] as const;

// value is what gets saved on the request; size and use are what the form shows.
const SIZE_NEEDED_OPTIONS = [
  { value: "1080 x 1080 Feed", size: "1080 × 1080", use: "Feed" },
  { value: "1080 x 1920 Story", size: "1080 × 1920", use: "Story" },
  { value: "300 x 250 Display", size: "300 × 250", use: "Display" },
  { value: "728 x 90 Leaderboard", size: "728 × 90", use: "Leaderboard" },
  { value: "970 x 250 Billboard", size: "970 × 250", use: "Billboard" },
  { value: "All standard sizes", size: "All standard sizes", use: "Every size above" },
];
const ALL_SIZES = "All standard sizes";

// Videos are delivered as MP4, vertical unless square is asked for.
const VIDEO_SIZE_OPTIONS = [
  { value: "Video 1080 x 1920", size: "1080 × 1920", use: "Vertical" },
  { value: "Video 1200 x 1200", size: "1200 × 1200", use: "Square" },
];
const DEFAULT_VIDEO_SIZE = VIDEO_SIZE_OPTIONS[0].value;

// Kept in sync with the backend's request costs in adplaylist-be/src/lib/billing.ts
const IMAGE_REQUEST_CREDITS = 1;
const VIDEO_REQUEST_CREDITS = 2;

const checkboxClass = "mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand";

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
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  // "Request more sizes" on an ad page sends ?ad=<slug> to prefill the ad link.
  const adParam = searchParams.get("ad");
  // The form only renders client-side (after auth), so window is safe here.
  const prefilledAdUrl =
    adParam && typeof window !== "undefined"
      ? `${window.location.origin}/ads/${encodeURIComponent(adParam)}`
      : "";
  const [typedAdUrl, setAdUrl] = useState<string | null>(null);
  const adUrl = typedAdUrl ?? prefilledAdUrl;
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
  const [sizes, setSizes] = useState<string[]>([]);
  // What's being asked for: images, a video or both.
  const [wantsImage, setWantsImage] = useState(true);
  const [wantsVideo, setWantsVideo] = useState(false);
  const [videoSizes, setVideoSizes] = useState<string[]>([DEFAULT_VIDEO_SIZE]);
  const cost =
    (wantsImage ? IMAGE_REQUEST_CREDITS : 0) + (wantsVideo ? VIDEO_REQUEST_CREDITS : 0);

  // "All standard sizes" stands alone; picking a specific size clears it.
  function toggleSize(opt: string) {
    setSizes((prev) => {
      if (prev.includes(opt)) return prev.filter((s) => s !== opt);
      if (opt === ALL_SIZES) return [ALL_SIZES];
      return [...prev.filter((s) => s !== ALL_SIZES), opt];
    });
  }

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
    if (!wantsImage && !wantsVideo) {
      return setSubmitError("Choose image, video or both.");
    }
    if (wantsVideo && videoSizes.length === 0) {
      return setSubmitError("Choose a size for the video.");
    }
    if (user?.account && user.account.credits < cost) {
      return setSubmitError(
        `This request needs ${cost} credits and you have ${user.account.credits}.`
      );
    }
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setSubmitting(true);
    setSubmitted(false);
    setSubmitError(null);
    try {
      const { request } = await api.createRequest({
        title: String(form.get("title")),
        adUrl: adUrl.trim(),
        media: [...(wantsImage ? ["image" as const] : []), ...(wantsVideo ? ["video" as const] : [])],
        sizeNeeded:
          [
            ...(wantsImage ? SIZE_NEEDED_OPTIONS.filter((opt) => sizes.includes(opt.value)) : []),
            ...(wantsVideo ? VIDEO_SIZE_OPTIONS.filter((opt) => videoSizes.includes(opt.value)) : []),
          ]
            .map((opt) => opt.value)
            .join(", ") || undefined,
        neededBy: String(form.get("neededBy") || "") || undefined,
        notes: String(form.get("notes") || "") || undefined,
        attachmentUrl: attachmentUrl ?? undefined,
        attachmentName: attachmentName ?? undefined,
      });
      setRequests((prev) => [request, ...prev]);
      setSubmitted(true);
      toast.success("Request submitted. Our team will pick it up shortly.");
      // Credits were spent; update the balance shown.
      if (user?.account) refresh();
      formEl.reset();
      setSizes([]);
      setWantsImage(true);
      setWantsVideo(false);
      setVideoSizes([DEFAULT_VIDEO_SIZE]);
      setAdUrl("");
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
                            href={req.deliveredUrl ?? `/ads/${req.ad.id}`}
                            {...(req.deliveredUrl
                              ? { target: "_blank", rel: "noopener noreferrer" }
                              : {})}
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
                        {req.deliveredUrl ? (
                          <div className="mt-auto grid grid-cols-2 gap-2">
                            <a
                              href={req.deliveredUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-brand px-2.5 py-1.5 text-center text-sm font-bold text-brand-foreground hover:opacity-90"
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
                        ) : (
                          <button
                            type="button"
                            onClick={() => setViewingRequest(req)}
                            className="mt-auto border border-border px-2.5 py-1.5 text-sm font-bold text-ink hover:bg-surface-2"
                          >
                            Details
                          </button>
                        )}
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
                ? `Uses ${cost} ${cost === 1 ? "credit" : "credits"} · ${user.account.credits} left`
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
                Ad link
              </label>
              <input
                type="url"
                name="adUrl"
                value={adUrl}
                onChange={(e) => setAdUrl(e.target.value)}
                placeholder="https://adplaylist.com/ads/…"
                required
                className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
              />
              <p className="mt-1 text-[11px] text-ink-muted">
                The ad this request is about. Paste the link from the ad&apos;s page.
              </p>
            </div>
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                What do you need?
              </label>
              <div className="grid grid-cols-2 gap-x-4 pt-0.5">
                {(
                  [
                    ["Image", wantsImage, setWantsImage],
                    ["Video", wantsVideo, setWantsVideo],
                  ] as const
                ).map(([label, checked, setChecked]) => (
                  <label key={label} className="group flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setChecked(!checked)}
                      className={checkboxClass}
                    />
                    <span
                      className={`text-sm leading-tight transition-colors ${
                        checked ? "font-semibold text-ink" : "text-ink/80 group-hover:text-ink"
                      }`}
                    >
                      {label}
                    </span>
                  </label>
                ))}
              </div>
              {wantsVideo && (
                <p className="mt-2 text-[11px] text-ink-muted">
                  A video request costs {VIDEO_REQUEST_CREDITS} credits. Delivered as MP4.
                </p>
              )}
            </div>
            {wantsVideo && (
              <div>
                <label className="mb-[5px] block text-xs text-ink/70">
                  Video size
                </label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-0.5">
                  {VIDEO_SIZE_OPTIONS.map((opt) => {
                    const checked = videoSizes.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="group flex cursor-pointer items-start gap-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setVideoSizes((prev) =>
                              checked ? prev.filter((s) => s !== opt.value) : [...prev, opt.value]
                            )
                          }
                          className={checkboxClass}
                        />
                        <span className="leading-tight">
                          <span
                            className={`block text-sm tabular-nums transition-colors ${
                              checked ? "font-semibold text-ink" : "text-ink/80 group-hover:text-ink"
                            }`}
                          >
                            {opt.size}
                          </span>
                          <span className="mt-0.5 block text-[11px] tracking-[0.04em] text-ink-muted">
                            {opt.use}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {wantsImage && (
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                {wantsVideo ? "Image sizes" : "Sizes needed"}
              </label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-0.5">
                {SIZE_NEEDED_OPTIONS.map((opt) => {
                  const checked = sizes.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={`group flex cursor-pointer items-start gap-2.5 ${
                        opt.value === ALL_SIZES ? "col-span-2" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSize(opt.value)}
                        className={checkboxClass}
                      />
                      <span className="leading-tight">
                        <span
                          className={`block text-sm tabular-nums transition-colors ${
                            checked ? "font-semibold text-ink" : "text-ink/80 group-hover:text-ink"
                          }`}
                        >
                          {opt.size}
                        </span>
                        <span className="mt-0.5 block text-[11px] tracking-[0.04em] text-ink-muted">
                          {opt.use}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            )}
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

      {viewingRequest && (
        <RequestDetailsModal
          request={viewingRequest}
          raisedBy={user.fullName}
          onClose={() => setViewingRequest(null)}
        />
      )}
    </div>
  );
}
