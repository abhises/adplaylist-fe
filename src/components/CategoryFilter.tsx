"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CATEGORY_GROUPS } from "@/lib/categories";

type Item = { name: string; group: string; count: number };

const QUICK_MATCHES = 8;

// "Pet Food" with "foo" → ["Pet ", "Foo", "d"], for highlighting the match.
function splitMatch(name: string, q: string) {
  const i = q ? name.toLowerCase().indexOf(q) : -1;
  return i < 0
    ? [name, "", ""]
    : [name.slice(0, i), name.slice(i, i + q.length), name.slice(i + q.length)];
}

function Highlighted({ name, q }: { name: string; q: string }) {
  const [a, b, c] = splitMatch(name, q);
  return (
    <>
      {a}
      {b && <mark className="bg-brand/20 text-inherit">{b}</mark>}
      {c}
    </>
  );
}

function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  className = "",
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  className?: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onChange={onChange}
      className={`h-[15px] w-[15px] shrink-0 cursor-pointer accent-brand ${className}`}
    />
  );
}

// Search, picked chips and "Browse all categories" for the library sidebar.
// Every category in the taxonomy is listed, the ones without ads greyed out;
// `counts` holds how many ads each category has.
export default function CategoryFilter({
  counts,
  selected,
  onChange,
}: {
  counts: Map<string, number>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ q: string } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // The taxonomy plus any category an ad carries that isn't in it (an ad
  // saved before the current list), so those can still be filtered on.
  const { items, groups } = useMemo(() => {
    const known = new Set<string>();
    const items: Item[] = [];
    const groups = CATEGORY_GROUPS.map((g) => ({ ...g }));
    for (const g of CATEGORY_GROUPS)
      for (const name of g.categories) {
        known.add(name);
        items.push({ name, group: g.name, count: counts.get(name) ?? 0 });
      }
    const extra = [...counts.keys()].filter((n) => !known.has(n)).sort();
    if (extra.length) {
      groups.push({ name: "Older categories", categories: extra });
      for (const name of extra)
        items.push({
          name,
          group: "Older categories",
          count: counts.get(name) ?? 0,
        });
    }
    return { items, groups };
  }, [counts]);

  const query = q.trim().toLowerCase();
  const found = useMemo(() => {
    if (!query) return [];
    return items
      .filter(
        (x) =>
          x.name.toLowerCase().includes(query) ||
          x.group.toLowerCase().includes(query),
      )
      .sort(
        (a, b) =>
          Number(b.name.toLowerCase().startsWith(query)) -
            Number(a.name.toLowerCase().startsWith(query)) ||
          b.count - a.count ||
          a.name.localeCompare(b.name),
      );
  }, [items, query]);

  // Close the quick matches on a click outside them.
  useEffect(() => {
    if (!query) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setQ("");
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [query]);

  function toggle(name: string) {
    onChange(
      selected.includes(name)
        ? selected.filter((n) => n !== name)
        : [...selected, name],
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-baseline gap-2">
        <p className="text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
          Category
        </p>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="ml-auto text-xs text-brand hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div ref={boxRef} className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQ("");
          }}
          placeholder={`Search ${items.length} categories`}
          aria-label="Search categories"
          className="w-full border border-border bg-surface-2 py-1.5 pr-8 pl-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink/70"
        />
        {query && (
          <>
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 px-1 text-base leading-none text-ink-muted hover:text-ink"
            >
              ×
            </button>
            <div className="absolute top-[calc(100%+4px)] left-0 z-30 flex w-full min-w-[260px] flex-col border border-border bg-card shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
              {found.slice(0, QUICK_MATCHES).map((m) => (
                <label
                  key={m.name}
                  className="flex cursor-pointer items-center gap-2.5 border-b border-ink/10 px-3 py-2 hover:bg-surface-2"
                >
                  <Checkbox
                    checked={selected.includes(m.name)}
                    onChange={() => toggle(m.name)}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`truncate text-sm ${m.count ? "text-ink" : "text-ink-muted"}`}
                    >
                      <Highlighted name={m.name} q={query} />
                    </span>
                    <span className="truncate text-[11px] text-ink-muted">
                      {m.group}
                    </span>
                  </span>
                  <span className="text-xs text-ink-muted">{m.count}</span>
                </label>
              ))}
              {found.length === 0 ? (
                <p className="px-3 py-3 text-sm text-ink-muted">
                  No categories match &ldquo;{q.trim()}&rdquo;
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setModal({ q: q.trim() });
                    setQ("");
                  }}
                  className="bg-surface-2 px-3 py-2.5 text-left text-sm font-semibold text-ink hover:text-brand"
                >
                  See all {found.length}{" "}
                  {found.length === 1 ? "match" : "matches"} →
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {selected.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              aria-label={`Remove ${name}`}
              className="flex items-center gap-1.5 bg-ink px-2 py-1 text-xs text-surface hover:bg-brand"
            >
              {name}
              <span aria-hidden className="opacity-70">
                ×
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setModal({ q: "" })}
        className="mt-2.5 flex w-full items-center justify-between gap-2 border border-border bg-card px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:border-ink"
      >
        Browse all categories
        <span className="text-xs font-normal text-ink-muted">
          {items.length} in {groups.length} groups
        </span>
      </button>

      {/* On document.body: the sidebar is its own containing block (the
          mobile drawer slides with a transform), which would trap a fixed
          overlay inside it. */}
      {modal &&
        createPortal(
          <CategoryModal
            initialQuery={modal.q}
            items={items}
            groups={groups}
            selected={selected}
            onApply={(next) => {
              onChange(next);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />,
          document.body,
        )}
    </div>
  );
}

function CategoryModal({
  initialQuery,
  items,
  groups,
  selected,
  onApply,
  onClose,
}: {
  initialQuery: string;
  items: Item[];
  groups: { name: string; categories: string[] }[];
  selected: string[];
  onApply: (next: string[]) => void;
  onClose: () => void;
}) {
  // Picks here are a draft until "Apply filters".
  const [draft, setDraft] = useState(() => new Set(selected));
  const [mq, setMq] = useState(initialQuery);
  const paneRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const countOf = useMemo(
    () => new Map(items.map((x) => [x.name, x.count])),
    [items],
  );

  const q = mq.trim().toLowerCase();
  const shown = groups
    .map((g) => {
      const groupMatch = !!q && g.name.toLowerCase().includes(q);
      const names = g.categories.filter(
        (n) => !q || groupMatch || n.toLowerCase().includes(q),
      );
      return { name: g.name, names, groupMatch };
    })
    .filter((g) => g.names.length > 0);

  function setMany(names: string[], on: boolean) {
    setDraft((prev) => {
      const next = new Set(prev);
      for (const n of names) {
        if (on) next.add(n);
        else next.delete(n);
      }
      return next;
    });
  }

  function jump(group: string) {
    const el = sectionRefs.current.get(group);
    if (el && paneRef.current) paneRef.current.scrollTop = el.offsetTop - 8;
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/45 sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col bg-surface shadow-[0_30px_80px_rgba(0,0,0,0.3)] sm:h-[min(780px,88vh)] sm:w-[min(1120px,94vw)]"
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-ink/15 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex flex-col gap-1">
            <h2
              id="category-modal-title"
              className="text-2xl font-extrabold text-ink"
            >
              All categories
            </h2>
            <p className="text-sm text-ink-muted">
              {items.length} categories in {groups.length} groups
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto px-1 text-3xl leading-none text-ink-muted hover:text-ink sm:order-last sm:ml-0"
          >
            ×
          </button>
          <input
            type="text"
            value={mq}
            onChange={(e) => setMq(e.target.value)}
            autoFocus
            placeholder="Search categories"
            aria-label="Search categories"
            className="w-full border border-border bg-card px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-muted focus:border-ink/70 sm:ml-auto sm:w-[min(380px,40vw)]"
          />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[230px_minmax(0,1fr)]">
          <nav
            aria-label="Category groups"
            className="hidden overflow-auto border-r border-ink/15 py-3 sm:block"
          >
            {shown.map((g) => {
              const n = groups
                .find((x) => x.name === g.name)!
                .categories.filter((c) => draft.has(c)).length;
              return (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => jump(g.name)}
                  className="flex w-full items-center gap-2 px-5 py-2 text-left text-[15px] text-ink hover:bg-surface-2"
                >
                  <span className="flex-1">{g.name}</span>
                  {n > 0 && (
                    <span className="bg-brand px-1.5 py-0.5 text-[11px] font-bold text-brand-foreground">
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div
            ref={paneRef}
            className="relative overflow-auto px-5 pb-6 sm:px-7"
          >
            {shown.map((g) => {
              const picked = g.names.filter((n) => draft.has(n)).length;
              const all = picked === g.names.length;
              return (
                <section
                  key={g.name}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(g.name, el);
                    else sectionRefs.current.delete(g.name);
                  }}
                  className="border-b border-ink/10 pt-5 pb-4"
                >
                  <label className="mb-3 flex cursor-pointer items-center gap-2.5">
                    <Checkbox
                      checked={all}
                      indeterminate={picked > 0 && !all}
                      onChange={() => setMany(g.names, !all)}
                    />
                    <span className="text-[17px] font-bold text-ink">
                      {g.name}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {q
                        ? `${g.names.length} ${g.names.length === 1 ? "match" : "matches"}`
                        : `${g.names.length} categories`}
                    </span>
                  </label>
                  <div className="grid grid-cols-1 gap-x-5 gap-y-2 pl-[25px] min-[480px]:grid-cols-2 lg:grid-cols-3">
                    {g.names.map((name) => {
                      const count = countOf.get(name) ?? 0;
                      return (
                        <label
                          key={name}
                          className="flex cursor-pointer items-start gap-2 text-[15px] leading-snug"
                        >
                          <Checkbox
                            checked={draft.has(name)}
                            onChange={() => setMany([name], !draft.has(name))}
                            className="mt-px"
                          />
                          <span
                            className={`min-w-0 flex-1 ${count ? "text-ink" : "text-ink-muted"}`}
                          >
                            <Highlighted
                              name={name}
                              q={g.groupMatch ? "" : q}
                            />
                          </span>
                          <span className="text-xs text-ink-muted">
                            {count}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {shown.length === 0 && (
              <p className="py-16 text-center text-base text-ink-muted">
                No categories match &ldquo;{mq.trim()}&rdquo;
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink/15 bg-card px-5 py-4 sm:px-6">
          <span className="text-base font-semibold text-ink">
            {draft.size ? `${draft.size} selected` : "None selected"}
          </span>
          {draft.size > 0 && (
            <button
              type="button"
              onClick={() => setDraft(new Set())}
              className="text-sm text-brand hover:underline"
            >
              Clear all
            </button>
          )}
          <div className="ml-auto flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-border px-5 py-2.5 text-sm font-semibold text-ink hover:border-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onApply([...draft])}
              className="bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90"
            >
              Apply filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
