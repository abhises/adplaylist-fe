"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CATEGORY_GROUPS, CATEGORY_OPTIONS } from "@/lib/categories";

// The category picker for the ad forms: the picked categories as chips (the
// first is the primary, used for breadcrumbs and page titles), then a search
// box that opens the list grouped like the library's "Browse all categories".
// A value outside the list (an ad saved before the current taxonomy) stays
// as a chip so editing doesn't silently drop it.
export default function CategorySelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  // A search matching a group name shows the whole group.
  const groups = CATEGORY_GROUPS.map((g) => ({
    name: g.name,
    categories:
      !q || g.name.toLowerCase().includes(q)
        ? g.categories
        : g.categories.filter((c) => c.toLowerCase().includes(q)),
  })).filter((g) => g.categories.length > 0);
  const firstMatch = groups[0]?.categories[0];

  function toggle(category: string) {
    onChange(
      value.includes(category)
        ? value.filter((c) => c !== category)
        : [...value, category]
    );
  }

  // The picker sits inside the ad <form>, so Enter must pick the first match
  // rather than submit the whole form.
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (firstMatch) {
        if (!value.includes(firstMatch)) onChange([...value, firstMatch]);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((category, i) => (
            <span
              key={category}
              title={i === 0 ? "Primary category" : undefined}
              className={`flex items-center gap-1 border py-0.5 pr-1 pl-2 text-xs ${
                i === 0
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-ink/25 bg-surface-2 text-ink"
              }`}
            >
              {category}
              {!CATEGORY_OPTIONS.includes(category) && (
                <span className="opacity-70">(old)</span>
              )}
              <button
                type="button"
                onClick={() => toggle(category)}
                aria-label={`Remove category ${category}`}
                title="Remove category"
                className="px-1 leading-none opacity-80 hover:opacity-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-brand">Pick at least one category.</p>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search categories…"
        className="mt-2 w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
      />

      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-border bg-card shadow-lg">
          {groups.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-ink-muted">
              No category matches &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.name} className="py-1">
                <p className="px-3 pt-1.5 pb-1 text-[11px] tracking-[0.08em] text-ink-muted uppercase">
                  {g.name}
                </p>
                {g.categories.map((c) => (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-1 text-sm text-ink hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(c)}
                      onChange={() => toggle(c)}
                      className="h-4 w-4 shrink-0 accent-brand"
                    />
                    {c}
                  </label>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
