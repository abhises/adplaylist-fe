"use client";

import { useEffect, type ReactNode } from "react";
import AdCard from "@/components/AdCard";
import { StatusTag, editButton } from "@/components/DataTable";
import type { CreativeRequest } from "@/lib/api";

type AttachmentKind = "image" | "pdf" | "other";

export function attachmentKind(nameOrUrl: string | undefined): AttachmentKind {
  const ext = (nameOrUrl ?? "").split(".").pop()?.toLowerCase();
  if (ext && ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
    return "image";
  }
  if (ext === "pdf") return "pdf";
  return "other";
}

export function shortDate(iso?: string) {
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

function creditLabel(cost = 1) {
  return `${cost} ${cost === 1 ? "credit" : "credits"}`;
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

// The full view of one request, shared by the client's Requests page and the
// staff queue: progress, dates, links, notes and the attachment. `raisedBy`
// is who sent it; `actions` adds buttons (e.g. Deliver) beside Close.
export default function RequestDetailsModal({
  request: r,
  raisedBy,
  onClose,
  actions,
}: {
  request: CreativeRequest;
  raisedBy: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const finished = r.status === "Delivered" || r.status === "Declined";
  const expected = addWorkingDays(new Date(r.createdAt), TURNAROUND_DAYS);
  return (
    <div
      onClick={() => onClose()}
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
            onClick={() => onClose()}
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
            <DetailRow label="Raised by">{raisedBy}</DetailRow>
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
            {r.media && (
              <DetailRow label="Format">
                {r.media.map((m) => (m === "video" ? "Video (MP4)" : "Image")).join(" + ")}
              </DetailRow>
            )}
            <DetailRow label="Sizes needed">{r.sizeNeeded ?? "Any size"}</DetailRow>
            {r.deliveredUrl && (
              <div className="sm:col-span-2">
                <DetailRow label="Delivered ad">
                  <a
                    href={r.deliveredUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-semibold text-brand underline-offset-2 hover:underline"
                  >
                    {r.deliveredUrl}
                  </a>
                </DetailRow>
              </div>
            )}
            {r.deliveryNote && (
              <div className="sm:col-span-2">
                <DetailRow label="Message from the team">
                  <p className="whitespace-pre-line">{r.deliveryNote}</p>
                </DetailRow>
              </div>
            )}
            {r.adUrl && (
              <div className="sm:col-span-2">
                <DetailRow label="Ad link">
                  <a
                    href={r.adUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-brand underline-offset-2 hover:underline"
                  >
                    {r.adUrl}
                  </a>
                </DetailRow>
              </div>
            )}
            <DetailRow label="Cost">
              {r.creditCharged ? (
                r.status === "Declined" ? (
                  <>
                    {creditLabel(r.creditCost)}{" "}
                    <span className="text-xs text-emerald-700">· refunded</span>
                  </>
                ) : (
                  creditLabel(r.creditCost)
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

        <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 px-6 py-4">
          {actions}
          <button
            onClick={() => onClose()}
            className="border border-ink/20 px-4 py-2 text-sm font-bold text-ink hover:border-ink/60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
