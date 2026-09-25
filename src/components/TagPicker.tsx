"use client";

import { useState, type KeyboardEvent } from "react";
import { ApiError } from "@/lib/api";
import { addTag, useTags } from "@/lib/tags";

// The ad's tags as removable chips, then the rest of the tag list as
// buttons to add, plus a way to add a brand-new tag to the list. Tags an ad
// has that aren't in the list yet (e.g. from a CSV) show as chips like any
// other; saving the ad adds them to the list.
export default function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const tags = useTags();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const known = (tags ?? []).map((t) => t.name);
  const isSelected = (tag: string) =>
    value.some((t) => t.toLowerCase() === tag.toLowerCase());
  const available = known.filter((t) => !isSelected(t));

  function remove(tag: string) {
    onChange(value.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    if (name.includes(",")) {
      setError("Tag names can't contain commas.");
      return;
    }
    const existing = known.find((t) => t.toLowerCase() === name.toLowerCase());
    setSaving(true);
    setError(null);
    try {
      const tag = existing ?? (await addTag(name)).name;
      if (!isSelected(tag)) onChange([...value, tag]);
      setNewName("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that tag.");
    } finally {
      setSaving(false);
    }
  }

  // The picker sits inside the add-ad <form>, so Enter must add the tag
  // rather than submit the whole form.
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Escape") {
      setAdding(false);
      setNewName("");
      setError(null);
    }
  }

  return (
    <div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 border border-brand bg-brand py-0.5 pr-1 pl-2 text-xs text-brand-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`Remove tag ${tag}`}
                title="Remove tag"
                className="px-1 leading-none opacity-80 hover:opacity-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-muted">No tags yet.</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {tags === null && (
          <span className="text-xs text-ink-muted">Loading tags…</span>
        )}
        {available.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange([...value, tag])}
            title="Add tag"
            className="border border-border px-2 py-0.5 text-xs text-ink-muted hover:border-ink/40 hover:text-ink"
          >
            + {tag}
          </button>
        ))}
        {adding ? (
          <span className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New tag"
              maxLength={100}
              className="w-32 border border-border bg-surface-2 px-2 py-0.5 text-xs text-ink outline-none focus:border-ink/70"
            />
            <button
              type="button"
              onClick={() => handleAdd()}
              disabled={saving || !newName.trim()}
              className="bg-brand px-2 py-0.5 text-xs font-bold text-brand-foreground disabled:opacity-60"
            >
              Add
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="border border-dashed border-border px-2 py-0.5 text-xs text-ink-muted hover:text-ink"
          >
            + New tag
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-brand">{error}</p>}
    </div>
  );
}
