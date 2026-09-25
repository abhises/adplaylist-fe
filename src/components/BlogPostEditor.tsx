"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/Link";
import DOMPurify from "dompurify";
import AppHeader from "@/components/AppHeader";
import BlogPostView from "@/components/BlogPostView";
import HtmlContentEditor from "@/components/HtmlContentEditor";
import { renderAdEmbeds } from "@/lib/adEmbed";
import { api, ApiError, type Ad, type BlogPostInput } from "@/lib/api";
import { slugify } from "@/lib/slug";
import {
  SUPPORTED_IMAGE_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/lib/upload";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

const EXCERPT_MAX = 500;

export default function BlogPostEditor({
  initial,
  onSave,
  onDelete,
}: {
  initial?: BlogPostInput & { publishedAt?: string };
  // Saves the post; a thrown error is shown next to the save button.
  onSave: (data: BlogPostInput) => Promise<void>;
  onDelete?: () => void;
}) {
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bodyUploading, setBodyUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  const [ads, setAds] = useState<Ad[]>([]);

  // The library, for the ad picker and for rendering embedded ads in the
  // preview exactly as the public post will.
  useEffect(() => {
    api
      .getAds()
      .then((res) => setAds(res.ads))
      .catch(() => {});
  }, []);
  const adsBySlug = useMemo(
    () => Object.fromEntries(ads.map((ad) => [ad.id, ad])),
    [ads]
  );

  // A blank link falls back to the title, the same way the API does.
  const effectiveSlug = slug || slugify(title);

  const previewHtml = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : renderAdEmbeds(
            DOMPurify.sanitize(bodyHtml, { ADD_ATTR: ["target"] }),
            adsBySlug
          ),
    [bodyHtml, adsBySlug]
  );

  async function handleCover(file: File | undefined) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setCoverError(invalid);
      return;
    }
    setCoverError(null);
    setCoverUploading(true);
    try {
      const { url } = await uploadImage(file);
      setCoverImageUrl(url);
    } catch (err) {
      setCoverError((err as Error).message);
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Enter a title.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ title, slug, excerpt, coverImageUrl, bodyHtml, published });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-10 py-4">
        <Link href="/admin/blog" className="text-sm font-medium text-brand">
          &larr; Blog posts
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {error && <span className="text-xs text-brand">{error}</span>}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="border border-border px-4 py-2 text-sm font-bold text-ink hover:border-brand hover:text-brand"
            >
              Delete
            </button>
          )}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            Published
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || bodyUploading || coverUploading}
            className="bg-brand px-5 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <main className="grid flex-1 grid-cols-1 xl:grid-cols-2">
        <div className="border-r border-ink/15 px-10 py-8">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="5 ad creative trends for this quarter"
                maxLength={255}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">Link</label>
              <div className="flex items-center border border-border bg-surface-2 text-sm">
                <span className="pl-2.5 text-ink-muted">/blog/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder={slugify(title) || "ad-creative-trends"}
                  className="min-w-0 flex-1 bg-transparent py-1.5 pr-2.5 text-ink outline-none"
                />
              </div>
            </div>
            <div>
              <div className="mb-[5px] flex justify-between text-xs">
                <label className="text-ink/70">Summary</label>
                <span className="text-ink-muted">
                  {excerpt.length}/{EXCERPT_MAX}
                </span>
              </div>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                maxLength={EXCERPT_MAX}
                rows={3}
                placeholder="One or two sentences shown on the blog index and in search results."
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                Cover image
              </label>
              <input
                ref={coverInputRef}
                type="file"
                accept={SUPPORTED_IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => handleCover(e.target.files?.[0])}
              />
              {coverImageUrl ? (
                <div className="relative aspect-[16/9] max-w-sm border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={coverUploading}
                      className="bg-surface px-2 py-1 text-xs font-bold text-ink disabled:opacity-60"
                    >
                      {coverUploading ? "Uploading…" : "Replace"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl("")}
                      className="bg-surface px-2 py-1 text-xs font-bold text-ink"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="flex aspect-[16/9] w-full max-w-sm flex-col items-center justify-center gap-1 border border-dashed border-border text-sm text-ink-muted disabled:opacity-60"
                >
                  <span className="text-2xl">&#128247;</span>
                  {coverUploading ? "Uploading…" : "Upload a cover image"}
                </button>
              )}
              {coverError && <p className="mt-1 text-xs text-brand">{coverError}</p>}
            </div>
          </div>

          <div className="mt-6">
            <HtmlContentEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              ads={ads}
              label="Post content (HTML)"
              onUploadingChange={setBodyUploading}
              placeholder={`<p>Opening paragraph…</p>\n\n<h2>A section heading</h2>\n<p>…</p>`}
              help={
                <>
                  Any HTML works: headings, paragraphs, lists, images, links
                  and inline styles. Scripts and event handlers are removed
                  when you save. &ldquo;Insert ad creative&rdquo; adds library
                  ads with their copy and an Adplaylist watermark; they update
                  when the ad is edited.
                </>
              }
            />
          </div>
        </div>

        <div className="bg-surface-2 px-6 py-8">
          <div className="mb-3 flex items-center justify-between text-xs text-ink-muted">
            <span className="font-medium tracking-[1px] uppercase">Preview</span>
            <span>
              /blog/{effectiveSlug || "…"}{" "}
              {published ? "· published" : "· draft, not public"}
            </span>
          </div>
          {/* Not clickable, so following a preview link can't lose unsaved work. */}
          <div className="pointer-events-none border border-ink/15 shadow-sm select-none">
            <BlogPostView
              title={title || "Post title"}
              excerpt={excerpt}
              coverImageUrl={coverImageUrl}
              bodyHtml={previewHtml}
              publishedAt={
                initial?.publishedAt ?? (published ? new Date().toISOString() : undefined)
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
