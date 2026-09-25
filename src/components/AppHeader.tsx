"use client";

import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/components/AccountMenu";
import { useAuth } from "@/lib/AuthProvider";
import { slugify } from "@/lib/slug";

export default function AppHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const canPublish = user?.role === "designer" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const libraryHref =
    user?.role === "client" ? `/library/${slugify(user.fullName)}` : "/library";

  const navLinks = [
    { href: libraryHref, label: "Explore ads" },
    { href: "/saved", label: "My saved ads" },
    { href: "/requests", label: "Requests" },
    ...(canPublish ? [{ href: "/add-ad", label: "Add ad" }] : []),
    ...(canPublish
      ? [{ href: "/admin/requests", label: "Requests queue" }]
      : []),
    ...(isAdmin ? [{ href: "/admin/brand-pages", label: "Brand pages" }] : []),
    ...(isAdmin ? [{ href: "/admin/tags", label: "Tags" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  // "/admin" is a prefix of the other admin links, so only the longest
  // matching link counts as active.
  const activeHref = navLinks
    .filter((link) => pathname.startsWith(link.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <header className="border-b border-ink/15 bg-surface">
      <div className="flex items-center justify-between px-10 py-4">
        <div className="flex items-center gap-10">
          <Link
            href={libraryHref}
            className="text-sm font-extrabold tracking-[2px] text-ink uppercase"
          >
            Adplaylist
          </Link>
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => {
              const active = link.href === activeHref;
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
