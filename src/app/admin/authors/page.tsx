"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "@/components/Link";
import AppHeader from "@/components/AppHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import Pagination, { usePagination } from "@/components/Pagination";
import Spinner from "@/components/Spinner";
import { api, ApiError, type Author, type AuthorInput } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";
import { SUPPORTED_IMAGE_ACCEPT, uploadImage, validateImageFile } from "@/lib/upload";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

const EMPTY: AuthorInput = {
  name: "",
  slug: "",
  jobTitle: "",
  credentials: "",
  bio: "",
  photoUrl: "",
  linkedinUrl: "",
  websiteUrl: "",
};

function toInput(author: Author): AuthorInput {
  return {
    name: author.name,
    slug: author.slug,
    jobTitle: author.jobTitle ?? "",
    credentials: author.credentials ?? "",
    bio: author.bio ?? "",
    photoUrl: author.photoUrl ?? "",
    linkedinUrl: author.linkedinUrl ?? "",
    websiteUrl: author.websiteUrl ?? "",
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-[5px] block text-xs text-ink/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

// The curators credited on ad pages ("Added by" / "Reviewed by"). Each has a
// public profile at /authors/<slug> listing the ads they added. An ad's CSV
// names its curator, which must match one of these by name.
export default function AdminAuthorsPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const [authors, setAuthors] = useState<Author[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // null: closed; "new": adding; an author: editing them.
  const [editing, setEditing] = useState<Author | "new" | null>(null);
  const [form, setForm] = useState<AuthorInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Author | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pagination = usePagination(authors?.length ?? 0, "adplaylist_authors_page_size");

  async function load() {
    try {
      setAuthors((await api.getAuthors()).authors);
    } catch {
      setError("Couldn't load authors.");
      setAuthors([]);
    }
  }

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(load);
  }, [user]);

  function open(target: Author | "new") {
    setEditing(target);
    setForm(target === "new" ? EMPTY : toInput(target));
    setFormError(null);
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) return setFormError(invalid);
    setUploading(true);
    setFormError(null);
    try {
      const { url } = await uploadImage(file);
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") await api.createAuthor(form);
      else await api.updateAuthor(editing.id, form);
      await load();
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save that author.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteAuthor(deleteTarget.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that author.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (!ready || !user) return null;

  const set = (key: keyof AuthorInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">Admin</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-ink">Authors</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-muted">
              The curators credited on ad pages. Each gets a public profile
              listing the ads they added, which helps search engines trust the
              content. An ad CSV&apos;s &ldquo;Added by&rdquo; and
              &ldquo;Reviewed by&rdquo; must match an author&apos;s name.
            </p>
          </div>
          <button
            type="button"
            onClick={() => open("new")}
            className="bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground"
          >
            + Add author
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-brand">{error}</p>}

        {authors === null ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Loading authors…
          </div>
        ) : authors.length === 0 ? (
          <p className="mt-8 text-sm text-ink-muted">No authors yet.</p>
        ) : (
          <table className="mt-8 w-full max-w-5xl border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink/15 text-left text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                <th className="py-2">Author</th>
                <th className="py-2">Job title</th>
                <th className="py-2">Profile</th>
                <th className="py-2 text-right">Ads added</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {authors.slice(pagination.start, pagination.end).map((a) => (
                <tr key={a.id} className="border-b border-ink/10">
                  <td className="py-3 font-bold text-ink">{a.name}</td>
                  <td className="py-3 text-ink-muted">{a.jobTitle ?? "—"}</td>
                  <td className="py-3">
                    <Link href={`/authors/${a.slug}`} className="text-brand">
                      /authors/{a.slug}
                    </Link>
                  </td>
                  <td className="py-3 text-right tabular-nums text-ink">{a.adCount ?? 0}</td>
                  <td className="py-3 text-right">
                    <button type="button" onClick={() => open(a)} className="mr-4 text-ink">
                      Edit
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(a)} className="text-brand">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {authors && authors.length > 0 && (
          <div className="max-w-5xl">
            <Pagination {...pagination.props} />
          </div>
        )}
      </main>

      <Modal open={editing !== null} onClose={() => setEditing(null)} maxWidth="max-w-xl">
        <form onSubmit={handleSave} className="space-y-3">
          <h2 className="text-xl font-extrabold text-ink">
            {editing === "new" ? "Add author" : "Edit author"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input required value={form.name} onChange={set("name")} className={inputClass} />
            </Field>
            <Field label="Profile URL slug" hint="Empty: made from the name.">
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
                  }))
                }
                placeholder="maya-chen"
                className={inputClass}
              />
            </Field>
            <Field label="Job title">
              <input
                value={form.jobTitle}
                onChange={set("jobTitle")}
                placeholder="Creative Strategist"
                className={inputClass}
              />
            </Field>
            <Field label="Credentials">
              <input
                value={form.credentials}
                onChange={set("credentials")}
                placeholder="9 years in DTC paid social"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Bio" hint="A sentence or two on their experience, shown on ad pages.">
            <textarea rows={3} value={form.bio} onChange={set("bio")} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="LinkedIn URL">
              <input type="url" value={form.linkedinUrl} onChange={set("linkedinUrl")} className={inputClass} />
            </Field>
            <Field label="Website URL">
              <input type="url" value={form.websiteUrl} onChange={set("websiteUrl")} className={inputClass} />
            </Field>
          </div>
          <div>
            <span className="mb-[5px] block text-xs text-ink/70">Photo</span>
            <div className="flex items-center gap-3">
              {form.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-xs text-ink-muted">
                  None
                </span>
              )}
              <input
                ref={photoInput}
                type="file"
                accept={SUPPORTED_IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => handlePhoto(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                disabled={uploading}
                className="border border-border px-3 py-1.5 text-xs font-bold text-ink disabled:opacity-60"
              >
                {uploading ? "Uploading…" : form.photoUrl ? "Replace" : "Upload"}
              </button>
              {form.photoUrl && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, photoUrl: "" }))}
                  className="text-xs text-brand"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          {formError && <p className="text-xs text-brand">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="border border-border px-4 py-2 text-sm font-bold text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-brand px-5 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save author"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete author?"
        message={
          deleteTarget && (
            <>
              <strong>{deleteTarget.name}</strong> will be removed from the{" "}
              {deleteTarget.adCount ?? 0} ad(s) they added or reviewed. The
              ads stay published.
            </>
          )
        }
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
