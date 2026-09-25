import type { ReactNode } from "react";
import Link from "@/components/Link";

export function formatPostDate(date?: string) {
  return date
    ? new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
}

// Header and footer for the public blog (/blog, /blog/:slug). No login needed.
export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-surface">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-10">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-extrabold tracking-[2px] text-ink uppercase"
            >
              Adplaylist
            </Link>
            <Link href="/blog" className="text-sm font-medium text-ink">
              Blog
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink-muted hover:text-ink">
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-10">
        {children}
      </main>
    </div>
  );
}
