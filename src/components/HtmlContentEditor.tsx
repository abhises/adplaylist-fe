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

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// The HTML box shared by the brand page and blog post editors, with buttons
// to insert an uploaded image or library ad creatives at the cursor.
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
  // The library, for the ad picker.
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
  const [pickerQuery, setPickerQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

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
    setPicked([]);
    setPickerQuery("");
  }

  function insertPickedAds() {
    if (picked.length) insertHtml(adEmbedSnippet(picked));
    closePicker();
  }

  const q = pickerQuery.trim().toLowerCase();
  const pickerAds = q
    ? ads.filter(
        (ad) =>
          ad.title.toLowerCase().includes(q) ||
          ad.headline.toLowerCase().includes(q) ||
          ad.category.toLowerCase().includes(q)
      )
    : ads;

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
            🖼 Insert ad creative
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

      <Modal open={pickerOpen} onClose={closePicker} maxWidth="max-w-3xl">
        <h2 className="text-lg font-extrabold text-ink">Insert ad creatives</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Pick one or more ads. Several are shown side by side.
        </p>
        <input
          type="search"
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
          placeholder="Search by name, headline or category"
          className={`mt-4 ${inputClass}`}
        />
        <div className="mt-4 grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
          {pickerAds.map((ad) => {
            const index = picked.indexOf(ad.id);
            return (
              <button
                key={ad.id}
                type="button"
                onClick={() =>
                  setPicked((list) =>
                    index >= 0
                      ? list.filter((id) => id !== ad.id)
                      : [...list, ad.id]
                  )
                }
                className={`relative border-2 text-left ${
                  index >= 0 ? "border-brand" : "border-transparent"
                }`}
              >
                <div
                  className={`relative aspect-[4/5] overflow-hidden ${
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
                  {index >= 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center bg-brand text-xs font-bold text-brand-foreground">
                      {index + 1}
                    </span>
                  )}
                </div>
                <p className="truncate px-1 py-1 text-xs font-bold text-ink">
                  {ad.title}
                </p>
              </button>
            );
          })}
          {pickerAds.length === 0 && (
            <p className="col-span-full text-sm text-ink-muted">No ads match.</p>
          )}
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
            onClick={insertPickedAds}
            disabled={picked.length === 0}
            className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
          >
            Insert {picked.length || ""} {picked.length === 1 ? "ad" : "ads"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
