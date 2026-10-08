"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import Spinner from "@/components/Spinner";
import { api, ApiError, type Author } from "@/lib/api";
import {
  csvToDrafts,
  draftToAd,
  emptyDraft,
  matchAuthor,
  type AdDraft,
} from "@/lib/adDraft";
import {
  SUPPORTED_IMAGE_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/lib/upload";
import { useRequireRole } from "@/lib/AuthProvider";
import { useToast } from "@/lib/ToastProvider";

// The most ads one batch takes, so a mistake can't publish a whole folder.
const MAX_BULK = 25;

type Status = "pending" | "publishing" | "published" | "failed";

// One ad in the batch: a CSV (or one row of a wide CSV) plus its creative.
type BulkItem = {
  key: string;
  csvName: string;
  // 1-based data row, for a wide CSV holding several ads.
  row?: number;
  draft: AdDraft;
  unrecognized: string[];
  invalid: string[];
  // The CSV's "File name from image PNG", if given.
  sourceImageName: string;
  // The image file's name; null until matched or picked.
  imageName: string | null;
  status: Status;
  error?: string;
  // Set once the creative is uploaded, so a retry doesn't upload it again.
  uploaded?: {
    imageName: string;
    url: string;
    dims: { width: number; height: number };
  };
  publishedId?: string;
};

type BulkImage = { file: File; previewUrl: string };

// Same rule as the backend's slugifyTitle, so duplicates in the batch are
// caught before publishing.
function slugFor(draft: AdDraft) {
  return (draft.slug || draft.adName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 150)
    .replace(/-$/, "");
}

// File names compared without folder, extension, case or punctuation.
function baseName(name: string) {
  return name
    .replace(/^.*[\\/]/, "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Picks an image for each unmatched ad: the CSV's "File name from image PNG"
// first, then its "Image file name", then an image named like the CSV file. With exactly one ad and one image
// left over, they're paired.
function autoMatch(items: BulkItem[], images: BulkImage[]): BulkItem[] {
  const taken = new Set(items.map((i) => i.imageName).filter(Boolean));
  const free = () => images.filter((img) => !taken.has(img.file.name));
  const find = (name: string) => {
    const wanted = baseName(name);
    return wanted
      ? free().find((img) => baseName(img.file.name) === wanted)
      : undefined;
  };
  const next = items.map((item) => {
    if (item.imageName || item.status === "published") return item;
    const img =
      find(item.sourceImageName) ??
      find(item.draft.imageFileName) ??
      (item.row === undefined ? find(item.csvName) : undefined);
    if (!img) return item;
    taken.add(img.file.name);
    return { ...item, imageName: img.file.name };
  });
  const unmatched = next.filter(
    (i) => !i.imageName && i.status !== "published",
  );
  const left = free();
  if (unmatched.length === 1 && left.length === 1) {
    return next.map((i) =>
      i === unmatched[0] ? { ...i, imageName: left[0].file.name } : i,
    );
  }
  return next;
}

export default function BulkAddAdsPage() {
  const { user, ready } = useRequireRole(["designer", "admin"]);
  const toast = useToast();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<BulkItem[]>([]);
  const [images, setImages] = useState<BulkImage[]>([]);
  const [authors, setAuthors] = useState<Author[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // Shown in the centre of the screen while a batch publishes.
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });

  useEffect(() => {
    api
      .getAuthors()
      .then(({ authors }) => setAuthors(authors))
      .catch(() => setAuthors([]));
  }, []);

  // Previews are object URLs; free them when the page goes away.
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () =>
      imagesRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)),
    [],
  );

  // Leaving mid-publish would stop the batch part way through.
  useEffect(() => {
    if (!publishing) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [publishing]);

  async function addCsvFiles(files: File[]) {
    const csvs = files.filter(
      (f) => /\.csv$/i.test(f.name) || f.type === "text/csv",
    );
    if (!csvs.length) return;
    const problems: string[] = [];
    const added: BulkItem[] = [];
    for (const file of csvs) {
      try {
        const drafts = csvToDrafts(await file.text(), emptyDraft());
        if (!drafts.length) {
          problems.push(`${file.name}: no ad found in it`);
          continue;
        }
        const wide = drafts.length > 1;
        drafts.forEach((d, i) =>
          added.push({
            key: `${file.name}#${i}`,
            csvName: file.name,
            row: wide ? i + 1 : undefined,
            draft: d.draft,
            unrecognized: d.unrecognized,
            invalid: d.invalid,
            sourceImageName: d.sourceImageName,
            imageName: null,
            status: "pending",
          }),
        );
      } catch {
        problems.push(`${file.name}: couldn't read it`);
      }
    }
    const names = new Set(csvs.map((f) => f.name));
    // Dropping a fixed CSV again replaces its unpublished ads.
    const kept = items.filter(
      (i) => !names.has(i.csvName) || i.status === "published",
    );
    const room = Math.max(MAX_BULK - kept.length, 0);
    if (added.length > room) {
      problems.push(
        `Only ${MAX_BULK} ads fit in one batch, so ${added.length - room} were left out.`,
      );
    }
    setItems(autoMatch([...kept, ...added.slice(0, room)], images));
    setNotice(problems.length ? problems.join(" · ") : null);
  }

  function addImageFiles(files: File[]) {
    const problems: string[] = [];
    const valid = files.filter((f) => {
      const invalid = validateImageFile(f);
      if (invalid) problems.push(`${f.name}: ${invalid}`);
      return !invalid;
    });
    if (valid.length) {
      const names = new Set(valid.map((f) => f.name));
      const replaced = images.filter((i) => names.has(i.file.name));
      replaced.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      const next = [
        ...images.filter((i) => !names.has(i.file.name)),
        ...valid.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ];
      setImages(next);
      setItems((prev) => autoMatch(prev, next));
    }
    setNotice(problems.length ? problems.join(" · ") : null);
  }

  function dropHandler(
    add: (files: File[]) => void,
    setOver: (v: boolean) => void,
  ) {
    return (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setOver(false);
      add(Array.from(e.dataTransfer.files ?? []));
    };
  }

  function updateItem(key: string, patch: Partial<BulkItem>) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function clearAll() {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
    setItems([]);
    setNotice(null);
    if (csvInputRef.current) csvInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  const imageByName = new Map(images.map((i) => [i.file.name, i]));
  const slugCounts = new Map<string, number>();
  for (const item of items) {
    const slug = slugFor(item.draft);
    if (slug) slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
  }

  // What stops an ad from being published, and what's only worth a look.
  function check(item: BulkItem) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const d = item.draft;
    if (!d.adName.trim()) errors.push("No ad name");
    if (!d.headline.trim()) errors.push("No headline");
    if (!item.imageName) errors.push("No image matched");
    else if (!imageByName.has(item.imageName))
      errors.push(`Image ${item.imageName} was removed`);
    for (const v of item.invalid) errors.push(`Not an option — ${v}`);
    const slug = slugFor(d);
    if (slug && (slugCounts.get(slug) ?? 0) > 1)
      errors.push(`URL slug "${slug}" is used twice in this batch`);
    if (authors) {
      if (d.authorName && !matchAuthor(authors, d.authorName))
        warnings.push(`No curator profile named "${d.authorName}"`);
      if (d.reviewerName && !matchAuthor(authors, d.reviewerName))
        warnings.push(`No reviewer profile named "${d.reviewerName}"`);
    }
    if (item.unrecognized.length)
      warnings.push(`Ignored rows: ${item.unrecognized.join(", ")}`);
    return { errors, warnings };
  }

  const toPublish = items.filter(
    (i) => i.status !== "published" && check(i).errors.length === 0,
  );
  const blocked = items.filter(
    (i) => i.status !== "published" && check(i).errors.length > 0,
  );
  const publishedCount = items.filter((i) => i.status === "published").length;

  // One at a time, so a failure is reported against its own row and the
  // rest of the batch still goes through.
  async function publishAll() {
    if (!toPublish.length) return;
    setPublishing(true);
    let ok = 0;
    let failed = 0;
    for (const [index, item] of toPublish.entries()) {
      setProgress({ done: index, total: toPublish.length, current: item.draft.adName });
      updateItem(item.key, { status: "publishing", error: undefined });
      try {
        const image = imageByName.get(item.imageName!)!;
        let uploaded = item.uploaded;
        if (!uploaded || uploaded.imageName !== image.file.name) {
          const { url, dims } = await uploadImage(image.file);
          uploaded = { imageName: image.file.name, url, dims };
          updateItem(item.key, { uploaded });
        }
        const author = authors
          ? matchAuthor(authors, item.draft.authorName)
          : undefined;
        const reviewer = authors
          ? matchAuthor(authors, item.draft.reviewerName)
          : undefined;
        const draft: AdDraft = {
          ...item.draft,
          // Typed slugs are cleaned up the same way the backend does.
          slug: slugFor(item.draft),
          photoUrl: uploaded.url,
          photoDims: uploaded.dims,
          authorSlug: item.draft.authorSlug || author?.slug || "",
          reviewerSlug: item.draft.reviewerSlug || reviewer?.slug || "",
        };
        const { ad } = await api.createAd(draftToAd(draft));
        updateItem(item.key, { status: "published", publishedId: ad.id });
        ok++;
      } catch (err) {
        const message =
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "Something went wrong.";
        updateItem(item.key, { status: "failed", error: message });
        failed++;
      }
    }
    setPublishing(false);
    if (failed)
      toast.error(`${ok} published, ${failed} failed. See the list for why.`);
    else
      toast.success(
        `${ok} ${ok === 1 ? "ad" : "ads"} published to the library.`,
      );
  }

  if (!ready || !user) return null;

  const dropZone = (over: boolean) =>
    `mt-1 flex h-32 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed text-ink-muted ${
      over ? "border-brand bg-brand/5" : "border-border"
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
          Admin
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-extrabold text-ink">Bulk add ads</h1>
          <Link href="/add-ad" className="text-sm text-brand">
            Add a single ad instead &rarr;
          </Link>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Drop up to {MAX_BULK} ad CSVs and their creatives. Each CSV is matched
          to the image named in its &quot;File name from image PNG&quot; row (or
          its &quot;Image file name&quot; row, or an image with the same name as
          the CSV). Check the list, then publish. Ads go live in the library as
          soon as they&apos;re published.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-[5px] block text-xs text-ink/70">
              Text data (CSVs)
            </label>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              multiple
              className="hidden"
              onChange={(e) => {
                addCsvFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            <div
              onClick={() => csvInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setCsvDragOver(true);
              }}
              onDragLeave={() => setCsvDragOver(false)}
              onDrop={dropHandler(addCsvFiles, setCsvDragOver)}
              className={dropZone(csvDragOver)}
            >
              <span className="text-2xl">&#128196;</span>
              <span className="text-sm">
                Drop CSV files, or click to browse
              </span>
              <span className="text-xs">
                One &quot;Adplaylist File&quot; template per ad, or one CSV with
                a row per ad
              </span>
            </div>
          </div>
          <div>
            <label className="mb-[5px] block text-xs text-ink/70">
              Creatives
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept={SUPPORTED_IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                addImageFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            <div
              onClick={() => imageInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setImageDragOver(true);
              }}
              onDragLeave={() => setImageDragOver(false)}
              onDrop={dropHandler(addImageFiles, setImageDragOver)}
              className={dropZone(imageDragOver)}
            >
              <span className="text-2xl">&#128444;</span>
              <span className="text-sm">Drop images, or click to browse</span>
              <span className="text-xs">
                PNG, JPG, WEBP, GIF or SVG · up to 8 MB each
              </span>
            </div>
          </div>
        </div>
        {notice && <p className="mt-2 text-xs text-brand">{notice}</p>}

        {items.length > 0 && (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink">
                {items.length} {items.length === 1 ? "ad" : "ads"} ·{" "}
                {images.length} {images.length === 1 ? "image" : "images"}
                {publishedCount > 0 && ` · ${publishedCount} published`}
                {blocked.length > 0 && (
                  <span className="text-brand">
                    {" "}
                    · {blocked.length} need fixing
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={clearAll}
                disabled={publishing}
                className="text-xs font-bold text-ink disabled:opacity-60"
              >
                Clear all
              </button>
            </div>

            <ul className="mt-3 divide-y divide-border border border-border">
              {items.map((item) => {
                const { errors, warnings } = check(item);
                const image = item.imageName
                  ? imageByName.get(item.imageName)
                  : undefined;
                const d = item.draft;
                return (
                  <li
                    key={item.key}
                    className="flex flex-wrap items-start gap-4 p-4"
                  >
                    <div className="h-20 w-20 shrink-0 border border-border bg-surface-2">
                      {image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image.previewUrl}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {d.adName || "Untitled ad"}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {[
                          d.categories.join(", "),
                          d.adFormat,
                          d.markets.join(", "),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {item.csvName}
                        {item.row !== undefined && ` · row ${item.row}`}
                      </p>
                      {item.status !== "published" && (
                        <select
                          value={item.imageName ?? ""}
                          disabled={publishing}
                          onChange={(e) =>
                            updateItem(item.key, {
                              imageName: e.target.value || null,
                            })
                          }
                          className="mt-2 max-w-full border border-border bg-surface-2 px-2 py-1 text-xs text-ink"
                        >
                          <option value="">Pick the image…</option>
                          {images.map((img) => (
                            <option key={img.file.name} value={img.file.name}>
                              {img.file.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {item.status !== "published" && (
                        // Editable so a slug that's taken (or clashes in the
                        // batch) can be fixed here and published again.
                        <label className="mt-2 flex max-w-md items-center border border-ink/30 bg-surface text-xs text-ink focus-within:border-brand hover:border-ink">
                          <span className="pl-2 font-bold text-ink-muted">Edit URL /</span>
                          <input
                            type="text"
                            value={d.slug}
                            placeholder={slugFor({ ...d, slug: "" })}
                            disabled={publishing}
                            aria-label={`URL slug for ${d.adName || "this ad"}`}
                            onChange={(e) =>
                              updateItem(item.key, {
                                draft: { ...d, slug: e.target.value },
                                // The old failure may no longer apply.
                                ...(item.status === "failed" && {
                                  status: "pending" as const,
                                  error: undefined,
                                }),
                              })
                            }
                            className="min-w-0 flex-1 bg-transparent px-1 py-1.5 outline-none"
                          />
                          <PencilIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                        </label>
                      )}
                      {item.status !== "published" &&
                        errors.map((e) => (
                          <p key={e} className="mt-1 text-xs text-brand">
                            {e}
                          </p>
                        ))}
                      {item.status !== "published" &&
                        warnings.map((w) => (
                          <p key={w} className="mt-1 text-xs text-ink-muted">
                            {w}
                          </p>
                        ))}
                      {item.status === "failed" && item.error && (
                        <p className="mt-1 text-xs text-brand">
                          Failed: {item.error}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2 text-xs">
                      {item.status === "published" && item.publishedId ? (
                        <Link
                          href={`/ads/${item.publishedId}`}
                          target="_blank"
                          className="font-bold text-ink"
                        >
                          Published &rarr;
                        </Link>
                      ) : item.status === "publishing" ? (
                        <span className="text-ink-muted">Publishing…</span>
                      ) : errors.length ? (
                        <span className="text-brand">Needs fixing</span>
                      ) : item.status === "failed" ? (
                        <span className="text-brand">Failed · will retry</span>
                      ) : (
                        <span className="text-ink">Ready</span>
                      )}
                      {item.status !== "published" && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          disabled={publishing}
                          className="font-bold text-ink-muted disabled:opacity-60"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={publishAll}
                disabled={publishing || toPublish.length === 0}
                className="bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-60"
              >
                {publishing
                  ? "Publishing…"
                  : `Publish ${toPublish.length} ${toPublish.length === 1 ? "ad" : "ads"} to library`}
              </button>
              {blocked.length > 0 && !publishing && (
                <span className="text-xs text-ink-muted">
                  Ads that need fixing are skipped. Fix the CSV and drop it
                  again to replace them.
                </span>
              )}
            </div>
          </>
        )}
      </main>

      {publishing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
          role="alertdialog"
          aria-live="polite"
          aria-label="Publishing ads"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-3 bg-surface p-8 text-center shadow-xl">
            <Spinner className="h-8 w-8" />
            <p className="text-lg font-extrabold text-ink">
              Publishing {Math.min(progress.done + 1, progress.total)} of {progress.total}…
            </p>
            {progress.current && (
              <p className="w-full truncate text-sm text-ink-muted">{progress.current}</p>
            )}
            <div className="h-1.5 w-full bg-surface-2">
              <div
                className="h-full bg-brand transition-[width] duration-300"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-ink-muted">Keep this tab open until it finishes.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
