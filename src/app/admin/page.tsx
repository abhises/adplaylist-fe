"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { api, ApiError, type AdminUser, type Role } from "@/lib/api";
import { useAuth, useRequireRole } from "@/lib/AuthProvider";

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
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(
    null
  );

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
          <p className="mt-8 text-sm text-ink-muted">Loading users…</p>
        )}
        {error && <p className="mt-8 text-sm text-brand">{error}</p>}

        {!loading && !error && (
          <table className="mt-6 w-full max-w-3xl border-collapse text-sm">
            <thead>
              <tr>
                {["User", "Email", "Joined", "Role"].map((h) => (
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
                const isSelf = u.id === currentUser?.id;
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
                          disabled={isSelf || savingId === u.id}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as Role)
                          }
                          title={isSelf ? "You can't change your own role" : undefined}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
