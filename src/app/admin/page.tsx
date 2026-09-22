"use client";

import { useEffect, useState, type FormEvent } from "react";
import AppHeader from "@/components/AppHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import Spinner from "@/components/Spinner";
import { api, ApiError, type AdminUser, type Role } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

const ROLES: Role[] = ["client", "designer", "admin"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminUsersPage() {
  const { user: authUser, ready } = useRequireRole(["admin"]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(
    null
  );

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    api
      .getUsers()
      .then(({ users }) => setUsers(users))
      .catch(() => setError("Couldn't load users."))
      .finally(() => setLoading(false));
  }, [authUser]);

  async function handleRoleChange(id: number, role: Role) {
    const previous = users;
    setRowError(null);
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, role } : u)));
    setSavingId(id);
    try {
      await api.updateUserRole(id, role);
    } catch (err) {
      setUsers(previous);
      setRowError({
        id,
        message: err instanceof ApiError ? err.message : "Couldn't update role.",
      });
    } finally {
      setSavingId(null);
    }
  }

  function openEdit(u: AdminUser) {
    setEditTarget(u);
    setEditFullName(u.fullName);
    setEditEmail(u.email);
    setEditError(null);
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setEditError(null);
    setEditSaving(true);
    try {
      const { user: updated } = await api.updateUser(editTarget.id, {
        fullName: editFullName,
        email: editEmail,
      });
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
      setEditTarget(null);
    } catch (err) {
      setEditError(
        err instanceof ApiError ? err.message : "Couldn't save changes."
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setRowError(null);
    setDeleting(true);
    try {
      await api.deleteUser(deleteTarget.id);
      setUsers((list) => list.filter((existing) => existing.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setRowError({
        id: deleteTarget.id,
        message: err instanceof ApiError ? err.message : "Couldn't delete user.",
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!ready || !authUser) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
          Admin
        </p>
        <h1 className="text-3xl font-extrabold text-ink">Users</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Manage who can publish ads and fulfil requests (designer), and who has
          full admin access.
        </p>

        {loading && (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading users…
          </div>
        )}
        {error && <p className="mt-8 text-sm text-brand">{error}</p>}

        {!loading && !error && (
          <table className="mt-6 w-full max-w-4xl border-collapse text-sm">
            <thead>
              <tr>
                {["User", "Email", "Joined", "Role", ""].map((h) => (
                  <th
                    key={h}
                    className="border-b-2 border-border p-2 text-left text-[11px] tracking-[0.08em] text-ink-muted uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isAdmin = u.role === "admin";
                return (
                  <tr key={u.id} className="hover:bg-surface-2/60">
                    <td className="border-b border-border p-2 font-semibold text-ink">
                      {u.fullName}
                    </td>
                    <td className="border-b border-border p-2 text-ink-muted">
                      {u.email}
                    </td>
                    <td className="border-b border-border p-2 text-ink-muted">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="border-b border-border p-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          disabled={isAdmin || savingId === u.id}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as Role)
                          }
                          title={isAdmin ? "Admins can't have their role changed" : undefined}
                          className="border border-border bg-surface-2 px-2.5 py-1 text-sm text-ink outline-none disabled:opacity-60"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        {savingId === u.id && (
                          <span className="text-xs text-ink-muted">Saving…</span>
                        )}
                      </div>
                      {rowError && rowError.id === u.id && (
                        <p className="mt-1 text-xs text-brand">{rowError.message}</p>
                      )}
                    </td>
                    <td className="border-b border-border p-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="text-sm text-ink hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(u)}
                        disabled={isAdmin}
                        title={isAdmin ? "Admins can't be deleted" : undefined}
                        className="ml-4 text-sm text-brand hover:underline disabled:cursor-not-allowed disabled:text-ink-muted disabled:no-underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user"
        message={
          deleteTarget && (
            <>
              Delete <strong className="text-ink">{deleteTarget.fullName}</strong>{" "}
              ({deleteTarget.email})? This can&rsquo;t be undone.
            </>
          )
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)}>
        <h2 className="text-lg font-extrabold text-ink">Edit user</h2>
        <form onSubmit={handleEditSubmit} className="mt-4">
          <div>
            <label className="mb-[5px] block text-xs text-ink/70">
              Full name
            </label>
            <input
              type="text"
              required
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
            />
          </div>
          <div className="mt-3">
            <label className="mb-[5px] block text-xs text-ink/70">Email</label>
            <input
              type="email"
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
            />
          </div>
          {editError && (
            <p className="mt-3 text-sm text-brand" role="alert">
              {editError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="border border-border px-4 py-2 text-sm font-bold text-ink hover:bg-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
            >
              {editSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
