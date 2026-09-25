"use client";

import { useEffect, useState, type FormEvent } from "react";
import AppHeader from "@/components/AppHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import Spinner from "@/components/Spinner";
import { api, ApiError, type AdminUser, type NewUserInput, type Role } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

const ROLES: Role[] = ["client", "designer", "editor", "admin"];

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

const EMPTY_NEW_USER: NewUserInput = {
  fullName: "",
  email: "",
  password: "",
  role: "editor",
  canManageBlog: false,
  canManageBrandPages: false,
};

// Blog / Brand pages checkboxes for editors, shared by the add and edit
// dialogs. Other roles don't get this access (admins always have it), so
// they just see a note.
function AccessCheckboxes({
  role,
  blog,
  brandPages,
  onChange,
}: {
  role: Role;
  blog: boolean;
  brandPages: boolean;
  onChange: (next: { canManageBlog?: boolean; canManageBrandPages?: boolean }) => void;
}) {
  if (role !== "editor") {
    return (
      <p className="mt-3 text-xs text-ink-muted">
        {role === "admin"
          ? "Admins can manage the blog and brand pages."
          : "Only editors can be given blog or brand page access."}
      </p>
    );
  }
  return (
    <fieldset className="mt-3">
      <legend className="mb-[5px] text-xs text-ink/70">Can manage</legend>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={blog}
            onChange={(e) => onChange({ canManageBlog: e.target.checked })}
            className="h-4 w-4 accent-brand"
          />
          Blog
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={brandPages}
            onChange={(e) => onChange({ canManageBrandPages: e.target.checked })}
            className="h-4 w-4 accent-brand"
          />
          Brand pages
        </label>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        What this editor can write, publish and delete.
      </p>
    </fieldset>
  );
}

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
  const [editBlog, setEditBlog] = useState(false);
  const [editBrandPages, setEditBrandPages] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserInput>(EMPTY_NEW_USER);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

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
      // Leaving the editor role clears blog / brand page access on the server.
      const { user: updated } = await api.updateUserRole(id, role);
      setUsers((list) => list.map((u) => (u.id === id ? updated : u)));
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
    setEditBlog(u.canManageBlog);
    setEditBrandPages(u.canManageBrandPages);
    setEditError(null);
  }

  function openAdd() {
    setNewUser(EMPTY_NEW_USER);
    setAddError(null);
    setAddOpen(true);
  }

  async function handleAddSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      newUser.role === "editor" &&
      !newUser.canManageBlog &&
      !newUser.canManageBrandPages
    ) {
      setAddError("Tick Blog, Brand pages or both for an editor.");
      return;
    }
    setAddError(null);
    setAddSaving(true);
    try {
      const { user: created } = await api.createUser(newUser);
      setUsers((list) => [...list, created]);
      setAddOpen(false);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Couldn't create user.");
    } finally {
      setAddSaving(false);
    }
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
        canManageBlog: editBlog,
        canManageBrandPages: editBrandPages,
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
        <div className="flex max-w-5xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-ink">Users</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Manage who can publish ads and fulfil requests (designer), who
              writes the blog and brand pages (editor), and who has full admin
              access.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground"
          >
            + Add user
          </button>
        </div>

        {loading && (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading users…
          </div>
        )}
        {error && <p className="mt-8 text-sm text-brand">{error}</p>}

        {!loading && !error && (
          <table className="mt-6 w-full max-w-5xl border-collapse text-sm">
            <thead>
              <tr>
                {["User", "Email", "Joined", "Role", "Access", ""].map((h) => (
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
                    <td className="border-b border-border p-2">
                      <div className="flex flex-wrap gap-1">
                        {isAdmin ? (
                          <span className="bg-ink/10 px-2 py-0.5 text-xs text-ink-muted">
                            Everything
                          </span>
                        ) : u.role !== "editor" ? (
                          <span className="text-xs text-ink-muted">—</span>
                        ) : !u.canManageBlog && !u.canManageBrandPages ? (
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="text-xs text-brand hover:underline"
                          >
                            No access yet: set it
                          </button>
                        ) : (
                          <>
                            {u.canManageBlog && (
                              <span className="bg-brand/10 px-2 py-0.5 text-xs text-brand">
                                Blog
                              </span>
                            )}
                            {u.canManageBrandPages && (
                              <span className="bg-brand/10 px-2 py-0.5 text-xs text-brand">
                                Brand pages
                              </span>
                            )}
                          </>
                        )}
                      </div>
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
          <AccessCheckboxes
            role={editTarget?.role ?? "client"}
            blog={editBlog}
            brandPages={editBrandPages}
            onChange={(next) => {
              if (next.canManageBlog !== undefined) setEditBlog(next.canManageBlog);
              if (next.canManageBrandPages !== undefined)
                setEditBrandPages(next.canManageBrandPages);
            }}
          />
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

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <h2 className="text-lg font-extrabold text-ink">Add user</h2>
        <form onSubmit={handleAddSubmit} className="mt-4">
          <div>
            <label className="mb-[5px] block text-xs text-ink/70">Full name</label>
            <input
              type="text"
              required
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="mt-3">
            <label className="mb-[5px] block text-xs text-ink/70">Email</label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="mt-3">
            <label className="mb-[5px] block text-xs text-ink/70">Password</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-ink-muted">
              At least 8 characters. Share it with them so they can sign in.
            </p>
          </div>
          <div className="mt-3">
            <label className="mb-[5px] block text-xs text-ink/70">Role</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
              className={inputClass}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <AccessCheckboxes
            role={newUser.role}
            blog={newUser.canManageBlog}
            brandPages={newUser.canManageBrandPages}
            onChange={(next) => setNewUser({ ...newUser, ...next })}
          />
          {addError && (
            <p className="mt-3 text-sm text-brand" role="alert">
              {addError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="border border-border px-4 py-2 text-sm font-bold text-ink hover:bg-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addSaving}
              className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
            >
              {addSaving ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
