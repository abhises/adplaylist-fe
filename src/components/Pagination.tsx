"use client";

import { useEffect, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 30, 50, 100];
const DEFAULT_PAGE_SIZE = 30;

// The rows-per-page picked last time on this table, if it's still one of
// the options; storage can be unavailable, so any failure means none.
function storedPageSize(key: string, options: number[]) {
  try {
    const n = Number(window.localStorage.getItem(key));
    return options.includes(n) ? n : null;
  } catch {
    return null;
  }
}

// Page state for a list of `total` rows. The page is clamped, so a delete
// that empties the last page shows the one before it; the page size is
// remembered per list under `storageKey`. Spread `props` onto <Pagination>
// and render rows `start` to `end`.
export function usePagination(
  total: number,
  storageKey: string,
  {
    options = PAGE_SIZE_OPTIONS,
    defaultSize = DEFAULT_PAGE_SIZE,
  }: { options?: number[]; defaultSize?: number } = {}
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultSize);

  // Applied after the first render, so a page rendered on the server (with
  // the default) matches what the browser hydrates.
  useEffect(() => {
    const stored = storedPageSize(storageKey, options);
    if (stored) Promise.resolve().then(() => setPageSize(stored));
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  function changePageSize(size: number) {
    setPageSize(size);
    // Stay on the rows that were being looked at.
    setPage(Math.floor(start / size) + 1);
    try {
      window.localStorage.setItem(storageKey, String(size));
    } catch {
      // Not remembered; the choice still applies on this page.
    }
  }

  return {
    start,
    end: start + pageSize,
    setPage,
    props: {
      page: currentPage,
      pageSize,
      total,
      onPageChange: setPage,
      onPageSizeChange: changePageSize,
      pageSizeOptions: options,
    },
  };
}

// The page numbers to show: all of them when there are few, otherwise the
// first, last and the ones around the current page, with null for a gap.
function pageItems(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const items: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(null);
    items.push(p);
  });
  return items;
}

const arrowClass =
  "flex h-8 w-8 items-center justify-center text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

// Table pagination in the style of YouTube Studio: "Rows per page", the
// range shown ("31–60 of 123"), first/previous/next/last arrows, plus page
// numbers to jump straight to a page. `page` is 1-based; the parent clamps it.
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 py-3 text-sm text-ink-muted"
    >
      <label className="flex items-center gap-2">
        Rows per page:
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border border-border bg-surface-2 px-1.5 py-1 text-ink outline-none focus:border-ink/70"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <span className="tabular-nums">
        {first}–{last} of {total}
      </span>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="First page"
          title="First page"
          className={arrowClass}
        >
          |&lsaquo;
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          title="Previous page"
          className={arrowClass}
        >
          &lsaquo;
        </button>
        {pageItems(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`h-8 min-w-8 px-2 tabular-nums ${
                p === page
                  ? "bg-brand/10 font-bold text-brand"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          title="Next page"
          className={arrowClass}
        >
          &rsaquo;
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Last page"
          title="Last page"
          className={arrowClass}
        >
          &rsaquo;|
        </button>
      </div>
    </nav>
  );
}
