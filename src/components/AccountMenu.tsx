"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { useTheme } from "@/lib/ThemeProvider";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-ink"
      >
        <span className="flex h-8 w-8 items-center justify-center bg-ink text-xs font-bold text-surface">
          {initials(user.fullName)}
        </span>
        {user.fullName}
        <span className="text-ink-muted">&#9662;</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 z-10 mt-2 w-64 border border-ink/15 bg-surface shadow-lg">
          <div className="border-b border-ink/15 px-4 py-3">
            <p className="text-sm font-bold text-ink">{user.fullName}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-2"
            >
              <span aria-hidden>&#9881;</span> Settings
            </Link>
            <Link
              href="/billing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-2"
            >
              <span aria-hidden>&#128179;</span> Billing &amp; Credits
            </Link>
          </div>

          <div className="border-t border-ink/15 py-1">
            <button
              onClick={() => {
                toggleTheme();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-2"
            >
              <span aria-hidden>&#9728;</span> Toggle theme
              <span className="ml-auto text-xs text-ink-muted">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            </button>
          </div>

          <div className="border-t border-ink/15 py-1">
            <button
              onClick={() => {
                setOpen(false);
                logout();
                router.push("/login");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-brand hover:bg-surface-2"
            >
              <span aria-hidden>&#8618;</span> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
