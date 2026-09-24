"use client";

import { useRef, useState } from "react";
import Link from "@/components/Link";
import AppHeader from "@/components/AppHeader";
import {
  CATEGORY_OPTIONS,
  DOMINANT_COLORS,
  LANGUAGE_OPTIONS,
  MARKET_OPTIONS,
  PLATFORM_OPTIONS,
  SIZE_OPTIONS,
} from "@/lib/ads";
import { draftToAd, type AdDraft } from "@/lib/adDraft";
import { ApiError } from "@/lib/api";
import {
  SUPPORTED_IMAGE_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/lib/upload";

// Mirrors the ad detail page (src/app/ads/[id]/page.tsx), which always shows
// the Marketplace / Messenger tab and a 4:5 creative.
const SQUARE_SIZE =
  SIZE_OPTIONS.find((s) => s.dims === "1200 × 1200") ?? SIZE_OPTIONS[0];

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

// A label/value row from the detail page. In edit mode `edit` replaces the
// value; in view mode rows with no value are hidden, as on the real page.
function Row({
  label,
  value,
  editing,
  edit,
}: {
  label: string;
  value: React.ReactNode;
  editing: boolean;
  edit: React.ReactNode;
}) {
  if (!editing && !value) return null;
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="shrink-0 text-ink-muted">{label}</span>
      {editing ? (
        <div className="min-w-0 flex-1">{edit}</div>
      ) : (
        <span className="text-right text-ink">{value}</span>
      )}
    </div>
  );
}

type AdEditorProps = {
  initialDraft: AdDraft;
  // Called on every edit, e.g. to keep a new ad's draft in sessionStorage.
  onDraftChange?: (draft: AdDraft) => void;
  // Saves the ad; a thrown error is shown next to the submit button.
  onSubmit: (draft: AdDraft) => Promise<void>;
  submitLabel: string;
  submittingLabel: string;
  backHref: string;
  backLabel: string;
  statusLabel: string;
};

// Step B: the ad shown exactly as its library page will look, with a toggle
// to edit the text in place and a button to replace the image. Used both to
// preview a new ad before publishing and for admins editing a live one.
export default function AdEditor({
  initialDraft,
  onDraftChange,
  onSubmit,
  submitLabel,
  submittingLabel,
  backHref,
  backLabel,
  statusLabel,
}: AdEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function update(patch: Partial<AdDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onDraftChange?.(next);
  }

  function toggleIn(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  async function handleReplaceImage(file: File | undefined) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const { url, dims } = await uploadImage(file);
      update({ photoUrl: url, photoDims: dims });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (!draft.adName.trim()) {
      setEditing(true);
      setError("Give the ad a name before saving.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(draft);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  const ad = draftToAd(draft);
  const hasCopy = !!(draft.kicker || draft.headline || draft.sub || draft.cta);
  const submitButton = (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={submitting || uploading}
      className="bg-brand px-5 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
    >
      {submitting ? submittingLabel : submitLabel}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-10 py-4">
        <Link href={backHref} className="text-sm font-medium text-brand">
          &larr; {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="border border-border px-4 py-2 text-sm font-bold text-ink"
          >
            {editing ? "✓ Done editing" : "✎ Edit text"}
          </button>
          {submitButton}
        </div>
      </div>

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_420px]">
        <div className="border-r border-ink/15 px-10 py-8">
          <div
            style={{ aspectRatio: "4 / 5" }}
            className={`group relative mx-auto w-full max-w-md overflow-hidden ${
              ad.photo ? "" : ad.swatch
            }`}
          >
            {ad.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.photo}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/80 text-sm text-ink">
                Uploading…
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_IMAGE_ACCEPT}
              className="hidden"
              onChange={(e) => handleReplaceImage(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute right-3 bottom-3 bg-surface px-3 py-1.5 text-xs font-bold text-ink shadow disabled:opacity-60"
            >
              &#128247; {ad.photo ? "Replace image" : "Add image"}
            </button>
          </div>
          {uploadError && (
            <p className="mx-auto mt-2 max-w-md text-xs text-brand">
              {uploadError}
            </p>
          )}

          <div className="mt-8">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Platforms
            </p>
            <div className="mt-2 flex flex-wrap gap-4">
              {(editing ? PLATFORM_OPTIONS : draft.platforms).map((platform) => (
                <label
                  key={platform}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={draft.platforms.includes(platform)}
                    disabled={!editing}
                    onChange={() =>
                      update({ platforms: toggleIn(draft.platforms, platform) })
                    }
                    className="h-4 w-4 accent-brand"
                  />
                  {platform}
                </label>
              ))}
            </div>
          </div>

          {editing ? (
            <div className="mt-6">
              <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                Placement sizes
              </p>
              <div className="mt-2 grid grid-cols-1 border border-border sm:grid-cols-2">
                {SIZE_OPTIONS.map((size) => (
                  <label
                    key={size.name}
                    className="flex items-center gap-2 border-b border-border px-2.5 py-1.5 text-sm text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={draft.sizes.includes(size.name)}
                      onChange={() =>
                        update({ sizes: toggleIn(draft.sizes, size.name) })
                      }
                      className="h-[15px] w-[15px] shrink-0 accent-brand"
                    />
                    <span className="min-w-0 flex-1 truncate">{size.name}</span>
                    <span className="text-xs text-ink-muted tabular-nums">
                      {size.dims}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-3">
              <div className="border border-ink/15 border-b-2 border-b-brand px-3 py-3 text-left text-sm font-bold text-ink">
                <span className="block">{SQUARE_SIZE.name}</span>
                <span className="block text-xs text-ink-muted">
                  {SQUARE_SIZE.dims}
                </span>
              </div>
              <span className="bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground opacity-60">
                Request more sizes
              </span>
            </div>
          )}
        </div>

        <div className="px-10 py-8">
          <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
            Creative &middot; {SQUARE_SIZE.dims}
          </p>
          {editing ? (
            <input
              type="text"
              value={draft.adName}
              onChange={(e) => update({ adName: e.target.value })}
              placeholder="Ad name"
              aria-label="Ad name"
              className="mt-1 w-full border border-border bg-surface-2 px-2.5 py-1.5 text-2xl font-extrabold text-ink outline-none focus:border-ink/70"
            />
          ) : (
            <h1 className="mt-1 text-3xl font-extrabold text-ink">
              {draft.adName || (
                <span className="text-ink/30">Untitled ad</span>
              )}
            </h1>
          )}

          {draft.canvaUrl && !editing ? (
            <a
              href={draft.canvaUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 block w-full bg-brand py-2.5 text-center text-sm font-bold text-brand-foreground"
            >
              &#9998; Edit in Canva
            </a>
          ) : (
            <span className="mt-6 block w-full bg-brand py-2.5 text-center text-sm font-bold text-brand-foreground opacity-60">
              &#9998; Edit in Canva
            </span>
          )}
          <span className="mt-2 flex w-full items-center justify-between border border-border px-3 py-2.5 text-sm font-bold text-ink/50">
            <span>&#8595; Download</span>
            <span>&#9662;</span>
          </span>

          <div className="mt-8">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Details
            </p>
            <div className="mt-2 divide-y divide-ink/10 border-t border-ink/10">
              <Row
                label="Category"
                value={draft.category}
                editing={editing}
                edit={
                  <select
                    value={draft.category}
                    onChange={(e) => update({ category: e.target.value })}
                    className={inputClass}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                }
              />
              <Row
                label="Market"
                value={draft.market}
                editing={editing}
                edit={
                  <select
                    value={draft.market}
                    onChange={(e) => update({ market: e.target.value })}
                    className={inputClass}
                  >
                    {MARKET_OPTIONS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                }
              />
              <Row
                label="Language"
                value={draft.language}
                editing={editing}
                edit={
                  <select
                    value={draft.language}
                    onChange={(e) => update({ language: e.target.value })}
                    className={inputClass}
                  >
                    {LANGUAGE_OPTIONS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                }
              />
              <Row
                label="Media type"
                value={<span className="capitalize">{draft.mediaType}</span>}
                editing={editing}
                edit={
                  <select
                    value={draft.mediaType}
                    onChange={(e) =>
                      update({ mediaType: e.target.value as AdDraft["mediaType"] })
                    }
                    className={inputClass}
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                }
              />
              {!editing && (
                <Row
                  label="Platforms"
                  value={draft.platforms.join(", ")}
                  editing={false}
                  edit={null}
                />
              )}
              <Row
                label="Dominant colour"
                value={draft.dominantColor}
                editing={editing}
                edit={
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {DOMINANT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        title={c.name}
                        aria-label={c.name}
                        onClick={() => update({ dominantColor: c.name })}
                        style={{ backgroundColor: c.hex }}
                        className={`h-6 w-6 border ${
                          draft.dominantColor === c.name
                            ? "outline outline-2 outline-offset-2 outline-brand"
                            : "border-ink/15"
                        }`}
                      />
                    ))}
                  </div>
                }
              />
              <Row
                label="Canva template"
                value={
                  draft.canvaUrl && (
                    <a
                      href={draft.canvaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand"
                    >
                      Open link
                    </a>
                  )
                }
                editing={editing}
                edit={
                  <input
                    type="url"
                    value={draft.canvaUrl}
                    onChange={(e) => update({ canvaUrl: e.target.value })}
                    placeholder="https://www.canva.com/design/…"
                    className={inputClass}
                  />
                }
              />
            </div>
          </div>

          {(editing || hasCopy) && (
            <div className="mt-8">
              <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                Ad copy
              </p>
              <div className="mt-2 divide-y divide-ink/10 border-t border-ink/10">
                {(
                  [
                    ["Kicker", "kicker"],
                    ["Headline", "headline"],
                    ["Supporting line", "sub"],
                    ["Call to action", "cta"],
                  ] as const
                ).map(([label, key]) => (
                  <Row
                    key={key}
                    label={label}
                    value={draft[key]}
                    editing={editing}
                    edit={
                      <input
                        type="text"
                        value={draft[key]}
                        onChange={(e) => update({ [key]: e.target.value })}
                        className={inputClass}
                      />
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {(editing || draft.description) && (
            <div className="mt-8">
              <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                Description
              </p>
              {editing ? (
                <textarea
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={4}
                  className={`mt-2 ${inputClass}`}
                />
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-ink">
                  {draft.description}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-2 border-t border-ink/15 pt-6">
            {submitButton}
            {error && <p className="text-xs text-brand">{error}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
