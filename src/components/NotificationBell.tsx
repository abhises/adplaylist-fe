"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/Link";
import type { AppNotification } from "@/lib/api";
import { useNotifications } from "@/lib/NotificationsProvider";

const PREVIEW_COUNT = 6;

export function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Where a notification leads.
export function notificationHref(n: AppNotification) {
  return n.link ?? "/notifications";
}

export function BellIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinejoin="round" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
    </svg>
  );
}

// The bell in the header: an unread badge, and the latest few in a dropdown.
// Renders nothing for visitors.
export default function NotificationBell() {
  const { enabled, notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!enabled) return null;

  return (
    <div ref={ref} className="relative" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-11 w-11 items-center justify-center text-ink hover:bg-surface-2 lg:h-10 lg:w-10"
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-30 mt-2 w-[min(360px,calc(100vw-32px))] border border-ink/15 bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <p className="text-sm font-bold text-ink">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-brand hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">No notifications yet.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {notifications.slice(0, PREVIEW_COUNT).map((n) => (
                <li key={n.id} className="border-b border-ink/10 last:border-b-0">
                  <Link
                    href={notificationHref(n)}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                      setOpen(false);
                    }}
                    className={`flex gap-3 px-4 py-3 hover:bg-surface-2 ${n.read ? "" : "bg-brand/5"}`}
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand"}`}
                    />
                    <span className="min-w-0">
                      <span className={`block text-sm leading-snug text-ink ${n.read ? "" : "font-semibold"}`}>
                        {n.title}
                      </span>
                      {n.body && <span className="block truncate text-xs text-ink-muted">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-ink-muted">{timeAgo(n.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-ink/10 px-4 py-2.5 text-center text-sm font-medium text-brand hover:bg-surface-2"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
