"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import AccountMenu from "@/components/AccountMenu";
import AccountBanner from "@/components/AccountBanner";
import { useAuth } from "@/lib/AuthProvider";
import { slugify } from "@/lib/slug";

type NavLink = { href: string; label: string };
type NavGroup = { label: string; links: NavLink[] };
type NavItem = NavLink | NavGroup;

const isGroup = (item: NavItem): item is NavGroup => "links" in item;

function navLinkClass(active: boolean) {
  return `border-b-2 pb-1 text-sm ${
    active
      ? "border-brand font-medium text-ink"
      : "border-transparent text-ink-muted hover:text-ink"
  }`;
}

// Opens on hover, and on click for touch / keyboard users.
function NavDropdown({
  group,
  activeHref,
}: {
  group: NavGroup;
  activeHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // A mouse already opened the menu by hovering, so its click must not
  // toggle it shut again; touch and keyboard clicks do toggle.
  const pointerType = useRef("");
  const active = group.links.some((link) => link.href === activeHref);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onPointerDown={(e) => (pointerType.current = e.pointerType)}
        onClick={() => {
          setOpen((v) => (pointerType.current === "mouse" ? true : !v));
          pointerType.current = "";
        }}
        className={`flex items-center gap-1 ${navLinkClass(active)}`}
      >
        {group.label}
        <span className="text-[10px] text-ink-muted">&#9662;</span>
      </button>

      {open && (
        // pt-2 instead of mt-2 so the pointer can cross the gap without
        // leaving the hover area.
        <div className="absolute top-full left-0 z-20 pt-2">
          <div className="w-48 border border-ink/15 bg-surface py-1 shadow-lg">
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm hover:bg-surface-2 ${
                  link.href === activeHref
                    ? "font-medium text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  // Below lg the nav links move into a menu opened from a button.
  const [menuOpen, setMenuOpen] = useState(false);
  const canPublish = user?.role === "designer" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const libraryHref =
    user?.role === "client" ? `/library/${slugify(user.fullName)}` : "/library";

  const contentLinks: NavLink[] = [
    ...(canPublish ? [{ href: "/add-ad", label: "Add ad" }] : []),
    ...(canPublish
      ? [{ href: "/admin/requests", label: "Requests queue" }]
      : []),
    ...(user?.permissions?.brandPages
      ? [{ href: "/admin/brand-pages", label: "Brand pages" }]
      : []),
    ...(user?.permissions?.blog ? [{ href: "/admin/blog", label: "Blog" }] : []),
  ];
  const adminLinks: NavLink[] = isAdmin
    ? [
        { href: "/admin", label: "Users" },
        { href: "/admin/authors", label: "Authors" },
        { href: "/admin/tags", label: "Tags" },
        { href: "/admin/home-section", label: "Home section" },
        { href: "/admin/feedback", label: "Feedback" },
        { href: "/admin/contact", label: "Contact" },
        { href: "/admin/pricing", label: "Pricing" },
      ]
    : [];

  // A group with a single link (e.g. an editor who only manages the blog)
  // shows as a plain link rather than a one-item dropdown.
  const group = (label: string, links: NavLink[]): NavItem[] =>
    links.length > 1 ? [{ label, links }] : links;

  const navItems: NavItem[] = [
    { href: libraryHref, label: "Explore ads" },
    { href: "/saved", label: "My saved ads" },
    { href: "/requests", label: "Requests" },
    ...group("Content", contentLinks),
    ...group("Admin", adminLinks),
  ];
  const allLinks = navItems.flatMap((item) =>
    isGroup(item) ? item.links : [item],
  );
  // "/admin" is a prefix of the other admin links, so only the longest
  // matching link counts as active.
  const activeHref = allLinks
    .filter((link) => pathname.startsWith(link.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <header className="sticky top-0 z-30 border-b border-ink/15 bg-surface lg:static">
      <div className="flex h-[72px] items-center justify-between gap-4 px-5 sm:px-10 lg:h-auto lg:py-4">
        <div className="flex items-center gap-10">
          <Link
            href={libraryHref}
            className="text-sm font-extrabold tracking-[2px] text-ink uppercase"
          >
            Adplaylist
          </Link>
          <nav className="hidden items-center gap-6 lg:flex xl:ml-[200px]">
            {navItems.map((item) =>
              isGroup(item) ? (
                <NavDropdown
                  key={item.label}
                  group={item}
                  activeHref={activeHref}
                />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClass(item.href === activeHref)}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/requests"
            className="flex items-center gap-1.5 bg-brand px-[14px] py-[10px] text-sm font-bold whitespace-nowrap text-brand-foreground lg:px-4 lg:py-2"
          >
            <span>+</span> <span className="sm:hidden">Request</span>
            <span className="hidden sm:inline">Request a creative</span>
          </Link>
          <AccountMenu />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="app-menu"
            aria-label="Menu"
            className="flex h-11 w-11 items-center justify-center border-[1.5px] border-ink text-[20px] text-ink lg:hidden"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="app-menu"
          // Following a link closes the menu.
          onClick={(e) => (e.target as HTMLElement).closest("a") && setMenuOpen(false)}
          className="flex max-h-[calc(100vh-72px)] flex-col overflow-y-auto border-t border-ink/15 px-5 pb-4 sm:px-10 lg:hidden"
        >
          {navItems.map((item) =>
            isGroup(item) ? (
              <div key={item.label} className="border-b border-ink/15 py-4">
                <p className="text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
                  {item.label}
                </p>
                {item.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block pt-3 text-[16px] ${
                      link.href === activeHref ? "font-bold text-brand" : "font-medium text-ink"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b border-ink/15 py-4 text-[18px] font-semibold ${
                  item.href === activeHref ? "text-brand" : "text-ink"
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      )}
      <AccountBanner />
    </header>
  );
}
