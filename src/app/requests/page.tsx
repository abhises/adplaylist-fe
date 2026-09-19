"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import AppHeader from "@/components/AppHeader";
import AdCard from "@/components/AdCard";
import { api, ApiError, type CreativeRequest } from "@/lib/api";
import { useRequireAuth } from "@/lib/AuthProvider";

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

// Mirrors the design system's .tag-accent / .tag-neutral / .tag-outline tokens.
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

function AttachmentPreview({ url, name }: { url: string; name?: string }) {
  const kind = attachmentKind(name ?? url);
  const displayName = name ?? url.split("/").pop() ?? "attachment";

  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-ink">{displayName}</p>
        <a
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

export default function RequestsPage() {
  const { user, ready } = useRequireAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Open");
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setSubmitting(true);
    setSubmitted(false);
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
      formEl.reset();
      clearAttachment();
      setTab("Open");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_380px]">
        <div className="px-8 py-7">
          <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
            Requests
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            Ask the creative team for a size, a market or a brand-new ad.
            Average turnaround 3 working days.
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

          {loading && (
            <p className="mt-8 text-sm text-ink-muted">Loading requests…</p>
          )}

          {!loading && tab === "Open" && (
            grouped.Open.length > 0 ? (
              <table className="mt-6 w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {["Request", "Type", "Needed by", "Status", ""].map((h) => (
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
                        <p className="font-semibold text-ink">
                          {req.title}
                          {req.attachmentUrl && (
                            <a
                              href={req.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="View attachment"
                              className="ml-1.5 inline-block align-middle text-ink-muted hover:text-brand"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="13"
                                height="13"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M21.4 11.1 12 20.5a5 5 0 0 1-7-7l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />
                              </svg>
                            </a>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          Raised by {user.fullName} &middot; {shortDate(req.createdAt)}
                        </p>
                      </td>
                      <td className="border-b border-border p-2 text-ink">{req.type}</td>
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
                      <td className="border-b border-border p-2 text-right">
                        <button
                          onClick={() => setViewingRequest(req)}
                          className="text-sm text-brand hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-10 text-sm text-ink-muted">
                No open requests to show yet.
              </p>
            )
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
                        <a
                          href={`/ads/${req.ad.id}`}
                          className="mt-auto border border-border px-2.5 py-1.5 text-center text-sm font-bold text-ink hover:bg-surface-2"
                        >
                          Open ad
                        </a>
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
            grouped.Declined.length > 0 ? (
              <table className="mt-6 w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {["Request", "Type", "Reason", ""].map((h) => (
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
                      <td className="border-b border-border p-2">
                        <p className="font-semibold text-ink">{req.title}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          Raised by {user.fullName} &middot; {shortDate(req.createdAt)}
                        </p>
                      </td>
                      <td className="border-b border-border p-2 text-ink">{req.type}</td>
                      <td className="border-b border-border p-2 leading-snug text-ink-muted">
                        {req.reason ?? "No reason given"}
                      </td>
                      <td className="border-b border-border p-2 text-right">
                        <button className="text-sm text-brand hover:underline">
                          Resubmit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-10 text-sm text-ink-muted">
                No declined requests to show yet.
              </p>
            )
          )}
        </div>

        <aside className="border-t border-ink/15 px-6 py-7 lg:border-t-0 lg:border-l-2 lg:border-ink/15">
          <p className="text-[11px] tracking-[0.12em] text-ink-muted uppercase">
            New request
          </p>
          <h2 className="mt-1.5 text-xl leading-tight font-extrabold tracking-[-0.01em] text-ink">
            Tell us what you need
          </h2>

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
        </aside>
      </main>

      {viewingRequest && (
        <div
          onClick={() => setViewingRequest(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-[520px] flex-col border border-border bg-surface shadow-lg"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-6 pb-5">
              <div className="min-w-0">
                <h2 className="text-xl leading-tight font-extrabold text-ink">
                  {viewingRequest.title}
                </h2>
                <span
                  className={`mt-2 inline-flex w-fit items-center px-2.5 py-[3px] text-[11px] tracking-[0.02em] ${
                    STATUS_STYLE[viewingRequest.status] ?? "bg-[#f8f4f4] text-[#444141]"
                  }`}
                >
                  {viewingRequest.status}
                </span>
              </div>
              <button
                onClick={() => setViewingRequest(null)}
                aria-label="Close"
                className="shrink-0 text-lg leading-none text-ink-muted hover:text-ink"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <section>
                <p className="text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                  Request details
                </p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <DetailRow label="Type">{viewingRequest.type}</DetailRow>
                  <DetailRow label="Needed by">
                    {shortDate(viewingRequest.neededBy)}
                  </DetailRow>
                  <DetailRow label="Sizes needed">
                    {viewingRequest.sizeNeeded ?? "—"}
                  </DetailRow>
                  <DetailRow label="Raised">
                    {user.fullName} &middot; {shortDate(viewingRequest.createdAt)}
                  </DetailRow>
                </div>
              </section>

              <section className="mt-5 border-t border-border pt-5">
                <p className="text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                  Notes for the creative team
                </p>
                <div className="mt-1.5 text-sm text-ink">
                  {viewingRequest.notes ? (
                    <p className="leading-relaxed">{viewingRequest.notes}</p>
                  ) : (
                    <span className="text-ink-muted">No notes added.</span>
                  )}
                </div>
              </section>

              {viewingRequest.reason && (
                <section className="mt-5 border-t border-border pt-5">
                  <p className="text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                    Decline reason
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink">
                    {viewingRequest.reason}
                  </p>
                </section>
              )}

              <section className="mt-5 border-t border-border pt-5">
                <p className="text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                  Attachment
                </p>
                {viewingRequest.attachmentUrl ? (
                  <AttachmentPreview
                    url={viewingRequest.attachmentUrl}
                    name={viewingRequest.attachmentName}
                  />
                ) : (
                  <p className="mt-1.5 text-sm text-ink-muted">None attached.</p>
                )}
              </section>
            </div>

            <div className="border-t border-border p-6 pt-5">
              <button
                onClick={() => setViewingRequest(null)}
                className="border border-border px-4 py-2 text-sm font-bold text-ink hover:bg-surface-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
