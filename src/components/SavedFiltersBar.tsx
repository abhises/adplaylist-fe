"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, type LibraryFilters, type SavedFilter } from "@/lib/api";

const MAX_SAVED_FILTERS = 3;

// Every key filled in and lists sorted, so two sets of filters that pick the
// same things compare equal whatever order they were clicked in.
function normalize(f: LibraryFilters) {
  const list = (v?: string[]) => [...(v ?? [])].sort();
  return JSON.stringify({
    keyword: f.keyword ?? "",
    mediaTypes: list(f.mediaTypes),
    platforms: list(f.platforms),
    categories: list(f.categories),
    country: f.country ?? "",
    language: f.language ?? "",
    addedDays: f.addedDays ?? null,
    formats: list(f.formats),
    canva: f.canva ?? "",
    premium: !!f.premium,
    adType: f.adType ?? "",
    lengths: list(f.lengths),
    colors: list(f.colors),
    tags: list(f.tags),
  });
}

// The library's saved filters: up to 3 named presets per user, each applied
// in one click. The starred one is applied when the library opens (unless
// the page was opened with filters of its own, e.g. a tag link).
export default function SavedFiltersBar({
  current,
  hasFilters,
  onApply,
  applyDefault,
}: {
  current: LibraryFilters;
  hasFilters: boolean;
  onApply: (filters: LibraryFilters) => void;
  applyDefault: boolean;
}) {
  const [presets, setPresets] = useState<SavedFilter[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read once, on load: later changes to applyDefault mustn't re-apply.
  const applyDefaultRef = useRef(applyDefault);
  const onApplyRef = useRef(onApply);
  useEffect(() => {
    onApplyRef.current = onApply;
  });

  useEffect(() => {
    api
      .getSavedFilters()
      .then(({ filters }) => {
        setPresets(filters);
        const preset = filters.find((p) => p.isDefault);
        if (preset && applyDefaultRef.current) onApplyRef.current(preset.filters);
      })
      .catch(() => {});
  }, []);

  const currentKey = normalize(current);
  const full = presets.length >= MAX_SAVED_FILTERS;

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const { filter } = await api.createSavedFilter({
        name: trimmed,
        filters: current,
        isDefault: makeDefault,
      });
      setPresets((list) => [
        ...list.map((p) => (filter.isDefault ? { ...p, isDefault: false } : p)),
        filter,
      ]);
      setNaming(false);
      setName("");
      setMakeDefault(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the filters.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDefault(preset: SavedFilter) {
    const isDefault = !preset.isDefault;
    const before = presets;
    setPresets((list) =>
      list.map((p) => ({ ...p, isDefault: p.id === preset.id ? isDefault : isDefault ? false : p.isDefault }))
    );
    try {
      await api.updateSavedFilter(preset.id, { isDefault });
    } catch {
      setPresets(before);
      setError("Couldn't update that saved filter.");
    }
  }

  async function remove(preset: SavedFilter) {
    const before = presets;
    setPresets((list) => list.filter((p) => p.id !== preset.id));
    try {
      await api.deleteSavedFilter(preset.id);
    } catch {
      setPresets(before);
      setError("Couldn't delete that saved filter.");
    }
  }

  // Nothing saved and nothing to save: no row, so the page stays as it was.
  if (presets.length === 0 && !hasFilters && !naming) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink/15 py-3 text-sm">
      <span className="text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
        Saved
      </span>

      {presets.map((preset) => {
        const active = normalize(preset.filters) === currentKey;
        return (
          <span
            key={preset.id}
            className={`flex items-center border text-xs ${
              active ? "border-brand bg-brand/10 text-brand" : "border-border text-ink"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleDefault(preset)}
              aria-pressed={preset.isDefault}
              aria-label={
                preset.isDefault
                  ? `Stop opening the library with ${preset.name}`
                  : `Open the library with ${preset.name}`
              }
              title={preset.isDefault ? "Opens the library with this — click to stop" : "Open the library with this"}
              className={`py-1 pr-1 pl-2 text-sm leading-none ${
                preset.isDefault ? "text-brand" : "opacity-40 hover:opacity-100"
              }`}
            >
              {preset.isDefault ? "★" : "☆"}
            </button>
            <button
              type="button"
              onClick={() => onApply(preset.filters)}
              aria-current={active ? "true" : undefined}
              className="py-1 font-bold hover:underline"
            >
              {preset.name}
            </button>
            <button
              type="button"
              onClick={() => remove(preset)}
              aria-label={`Delete saved filter ${preset.name}`}
              title="Delete"
              className="px-1.5 py-1 text-sm leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </span>
        );
      })}

      {naming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setNaming(false)}
            maxLength={60}
            placeholder="Name, e.g. Pets – new this week"
            aria-label="Name for these filters"
            className="w-56 border border-border bg-surface-2 px-2 py-1 text-xs text-ink outline-none focus:border-ink/70"
          />
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(e) => setMakeDefault(e.target.checked)}
              className="h-[13px] w-[13px] accent-brand"
            />
            Open the library with these
          </label>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="bg-brand px-2.5 py-1 text-xs font-bold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setNaming(false)}
            className="text-xs font-bold text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        </form>
      ) : hasFilters && full ? (
        <span className="text-xs text-ink-muted">
          {MAX_SAVED_FILTERS} of {MAX_SAVED_FILTERS} saved — delete one to save these filters
        </span>
      ) : hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setNaming(true);
          }}
          className="text-xs font-bold text-brand hover:text-brand/80"
        >
          + Save these filters
        </button>
      ) : null}

      {error && (
        <span className="text-xs text-brand" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
