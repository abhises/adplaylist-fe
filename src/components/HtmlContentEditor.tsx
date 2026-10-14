"use client";

import { useRef, useState, type ReactNode } from "react";
import Modal from "@/components/Modal";
import { adEmbedSnippet } from "@/lib/adEmbed";
import type { Ad } from "@/lib/api";
import {
  SUPPORTED_IMAGE_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/lib/upload";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

// How many ads can be added in one go; they're shown side by side.
const MAX_AD_URLS = 3;

// The ad a pasted link points at: the slug of an ad page (…/ads/<slug>, on
// any of our hosts).
function adSlugFromUrl(value: string) {
  let path: string;
  try {
    path = new URL(value.trim()).pathname;
  } catch {
    return null;
  }
  return path.match(/^\/ads\/([a-z0-9-]+)\/?$/)?.[1] ?? null;
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// The HTML box shared by the brand page and blog post editors, with buttons
// to insert an uploaded image, or library ad creatives by their page links,
// at the cursor.
// `snippets` adds editor-specific insert buttons (e.g. a sign-up button).
export default function HtmlContentEditor({
  value,
  onChange,
  ads,
  label,
  placeholder,
  help,
  snippets = [],
  onUploadingChange,
}: {
  value: string;
  onChange: (html: string) => void;
  // The library, to check pasted ad links against.
  ads: Ad[];
  label: string;
  placeholder?: string;
  help?: ReactNode;
  snippets?: { label: string; html: string }[];
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [adUrls, setAdUrls] = useState<string[]>(() => Array(MAX_AD_URLS).fill(""));

  // Inserts a snippet at the cursor (or replaces the selection).
  function insertHtml(snippet: string) {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + snippet + value.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    });
  }

  function setUploadingState(next: boolean) {
    setUploading(next);
    onUploadingChange?.(next);
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploadError(null);
    setUploadingState(true);
    try {
      const { url } = await uploadImage(file);
      insertHtml(`\n<img src="${escapeHtml(url)}" alt="" />\n`);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploadingState(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function closePicker() {
    setPickerOpen(false);
    setAdUrls(Array(MAX_AD_URLS).fill(""));
  }

  // What's wrong with a pasted link, if anything. An empty box is fine.
  function adUrlError(url: string) {
    if (!url.trim()) return null;
    const slug = adSlugFromUrl(url);
    if (!slug) return "Paste the link of an ad's page, like https://adplaylist.com/ads/…";
    // Only checked once the library has loaded.
    if (ads.length > 0 && !ads.some((ad) => ad.id === slug)) return "No ad found at this link.";
    return null;
  }

  // The ads to add, in the order pasted, each once.
  const slugs = [
    ...new Set(adUrls.map(adSlugFromUrl).filter((slug): slug is string => !!slug)),
  ];
  const invalid = adUrls.some((url) => adUrlError(url));

  function insertAdUrls() {
    if (slugs.length && !invalid) insertHtml(adEmbedSnippet(slugs));
    closePicker();
  }

  return (
    <div>
      <div className="mb-[5px] flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs text-ink/70">{label}</label>
        <div className="flex gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept={SUPPORTED_IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => handleImage(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            className="border border-border px-3 py-1 text-xs font-bold text-ink disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "📷 Insert image"}
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="border border-border px-3 py-1 text-xs font-bold text-ink"
          >
            🔗 Add ad URL
          </button>
          {snippets.map((snippet) => (
            <button
              key={snippet.label}
              type="button"
              onClick={() => insertHtml(snippet.html)}
              className="border border-border px-3 py-1 text-xs font-bold text-ink"
            >
              {snippet.label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        aria-label={label}
        ref={bodyRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={24}
        spellCheck={false}
        placeholder={placeholder}
        className={`${inputClass} font-mono text-xs leading-relaxed`}
      />
      {uploadError && <p className="mt-1 text-xs text-brand">{uploadError}</p>}
      {help && <p className="mt-1 text-xs text-ink-muted">{help}</p>}

      <Modal open={pickerOpen} onClose={closePicker} maxWidth="max-w-xl">
        <h2 className="text-lg font-extrabold text-ink">Add ad creatives</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Paste the link of each ad&apos;s page, up to {MAX_AD_URLS}. Several are shown side by
          side.
        </p>
        <div className="mt-4 space-y-3">
          {adUrls.map((url, i) => {
            const slug = adSlugFromUrl(url);
            const ad = slug ? ads.find((a) => a.id === slug) : undefined;
            const error = adUrlError(url);
            return (
              <div key={i}>
                <label className="mb-[5px] block text-xs text-ink/70">Ad URL {i + 1}</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) =>
                    setAdUrls((list) => list.map((u, n) => (n === i ? e.target.value : u)))
                  }
                  placeholder="https://adplaylist.com/ads/…"
                  autoFocus={i === 0}
                  className={`${inputClass} ${error ? "border-brand" : ""}`}
                />
                {error ? (
                  <p className="mt-1 text-xs text-brand">{error}</p>
                ) : (
                  ad && <p className="mt-1 truncate text-xs text-ink-muted">✓ {ad.title}</p>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={closePicker}
            className="border border-border px-4 py-2 text-sm font-bold text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={insertAdUrls}
            disabled={slugs.length === 0 || invalid}
            className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
          >
            Add {slugs.length || ""} {slugs.length === 1 ? "ad" : "ads"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
