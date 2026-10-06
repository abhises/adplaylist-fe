"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import Link from "@/components/Link";
import { BellIcon, notificationHref, timeAgo } from "@/components/NotificationBell";
import Spinner from "@/components/Spinner";
import { useRequireAuth } from "@/lib/AuthProvider";
import { useNotifications } from "@/lib/NotificationsProvider";

const FILTERS = ["All", "Unread"] as const;

export default function NotificationsPage() {
  const { user, ready } = useRequireAuth();
  const { notifications, unread, loading, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  if (!ready || !user) return null;

  const shown = filter === "Unread" ? notifications.filter((n) => !n.read) : notifications;
  const isStaff = user.role === "designer" || user.role === "admin";

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-5 py-8 sm:px-10">
        <h1 className="text-3xl font-extrabold text-ink">Notifications</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {user.role === "admin"
            ? "New requests, enquiries, feedback, sign-ups and payments arrive here live."
            : isStaff
              ? "New creative requests arrive here live, with who sent them."
              : "Updates on your creative requests arrive here live."}{" "}
          What you mark as read only changes for you.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div className="flex border border-border">
            {FILTERS.map((f, i) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-[7px] text-xs ${i > 0 ? "border-l border-border" : ""} ${
                  filter === f ? "bg-brand text-brand-foreground" : "text-ink hover:bg-surface-2"
                }`}
              >
                {f === "Unread" ? `Unread · ${unread}` : f}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button type="button" onClick={markAllRead} className="text-sm text-brand hover:underline">
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading notifications…
          </div>
        ) : shown.length === 0 ? (
          <div className="mt-12 flex max-w-3xl flex-col items-center gap-2 text-center text-sm text-ink-muted">
            <BellIcon className="h-8 w-8" />
            {filter === "Unread" ? "You're all caught up." : "No notifications yet."}
          </div>
        ) : (
          <ul className="mt-6 max-w-3xl border-t border-border">
            {shown.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-4 border-b border-border px-3 py-4 ${n.read ? "" : "bg-brand/5"}`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm text-ink ${n.read ? "" : "font-semibold"}`}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-ink-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-ink-muted">
                    {timeAgo(n.createdAt)}
                    {isStaff && n.actor && (
                      <>
                        {" · "}
                        <a href={`mailto:${n.actor.email}`} className="hover:text-ink hover:underline">
                          {n.actor.email}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm">
                  {n.link && (
                    <Link
                      href={notificationHref(n)}
                      onClick={() => !n.read && markRead(n.id)}
                      className="text-brand hover:underline"
                    >
                      {n.requestId ? "View request" : "Open"}
                    </Link>
                  )}
                  {!n.read && (
                    <button type="button" onClick={() => markRead(n.id)} className="text-ink-muted hover:text-ink">
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
