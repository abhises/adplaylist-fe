"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "@/components/Link";
import AppHeader from "@/components/AppHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import Spinner from "@/components/Spinner";
import { api, ApiError, type Ad, type Tag } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";
import { reloadTags, useTags } from "@/lib/tags";

const inputClass =
  "border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

export default function AdminTagsPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const tags = useTags();
  const [ads, setAds] = useState<Ad[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() =>
      api
        .getAds()
        .then((res) => setAds(res.ads))
        .catch(() => {})
    );
  }, [user]);

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ad of ads) {
      for (const tag of ad.tags ?? []) {
        const key = tag.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [ads]);

  // Renames and deletes rewrite the tags on ads, so reload both lists.
  async function refresh() {
    await reloadTags();
    const res = await api.getAds();
    setAds(res.ads);
  }

  function message(err: unknown, fallback: string) {
    return err instanceof ApiError ? err.message : fallback;
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError(null);
    try {
      await api.createTag(name);
      await reloadTags();
      setNewName("");
    } catch (err) {
      setError(message(err, "Couldn't add that tag."));
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(tag: Tag) {
    const name = editName.trim();
    if (!name || name === tag.name) {
      setEditingId(null);
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      await api.renameTag(tag.id, name);
      await refresh();
      setEditingId(null);
    } catch (err) {
      setError(message(err, "Couldn't rename that tag."));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteTag(deleteTarget.id);
      await refresh();
    } catch (err) {
      setError(message(err, "Couldn't delete that tag."));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (!ready || !user) return null;

  const deleteCount = deleteTarget
    ? (usage.get(deleteTarget.name.toLowerCase()) ?? 0)
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
          Admin
        </p>
        <h1 className="text-3xl font-extrabold text-ink">Tags</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The tags designers pick from when adding an ad. Renaming or deleting
          a tag updates every ad that uses it.
        </p>

        <form onSubmit={handleAdd} className="mt-6 flex max-w-md gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New tag, e.g. pet food"
            maxLength={100}
            className={`min-w-0 flex-1 ${inputClass}`}
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="bg-brand px-5 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
          >
            Add tag
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-brand" role="alert">
            {error}
          </p>
        )}

        {tags === null ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading…
          </div>
        ) : tags.length === 0 ? (
          <p className="mt-8 text-sm text-ink-muted">No tags yet.</p>
        ) : (
          <div className="mt-8 max-w-2xl overflow-x-auto border-t border-ink/15">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/15 text-xs text-ink-muted">
                  <th className="py-3 pr-4 font-medium">Tag</th>
                  <th className="py-3 pr-4 font-medium">Ads</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => {
                  const count = usage.get(tag.name.toLowerCase()) ?? 0;
                  const isEditing = editingId === tag.id;
                  return (
                    <tr key={tag.id} className="border-b border-ink/10">
                      <td className="py-2.5 pr-4 text-ink">
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editName}
                            maxLength={100}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(tag);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className={`w-full ${inputClass}`}
                          />
                        ) : (
                          tag.name
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        {count > 0 ? (
                          <Link
                            href={`/library?tag=${encodeURIComponent(tag.name)}`}
                            className="text-brand"
                          >
                            {count}
                          </Link>
                        ) : (
                          <span className="text-ink-muted">0</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="mr-3 text-sm text-ink-muted hover:text-ink"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRename(tag)}
                              disabled={savingEdit}
                              className="text-sm font-medium text-brand disabled:opacity-60"
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(tag.id);
                                setEditName(tag.name);
                                setError(null);
                              }}
                              className="mr-3 text-sm font-medium text-brand"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(tag)}
                              className="text-sm text-ink-muted hover:text-brand"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete tag"
        message={
          deleteTarget && (
            <>
              Delete <strong className="text-ink">{deleteTarget.name}</strong>?
              {deleteCount > 0 &&
                ` It will be removed from ${deleteCount} ad${deleteCount > 1 ? "s" : ""}.`}{" "}
              This can&rsquo;t be undone.
            </>
          )
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
