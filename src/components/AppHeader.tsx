"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/components/AccountMenu";

const NAV_LINKS = [
  { href: "/library", label: "Explore ads" },
  { href: "/saved", label: "My saved ads" },
  { href: "/requests", label: "Requests" },
  { href: "/add-ad", label: "Add ad" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-ink/15 bg-surface">
      <div className="flex items-center justify-between px-10 py-4">
        <div className="flex items-center gap-10">
          <Link
            href="/library"
            className="text-sm font-extrabold tracking-[2px] text-ink uppercase"
          >
            Adplaylist
          </Link>
          <nav className="flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`border-b-2 pb-1 text-sm ${
                    active
                      ? "border-brand font-medium text-ink"
                      : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/requests"
            className="flex items-center gap-1.5 bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
          >
            <span>+</span> Request a creative
          </Link>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
