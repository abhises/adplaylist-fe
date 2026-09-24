"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import Spinner from "@/components/Spinner";
import { api, type BrandPage } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

export default function BrandPagesList() {
  const { user, ready } = useRequireRole(["admin"]);
  const [pages, setPages] = useState<BrandPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() =>
      api
        .getBrandPages()
        .then((res) => setPages(res.pages))
        .catch(() => setError("Couldn't load brand pages."))
        .finally(() => setLoading(false))
    );
  }, [user]);

  async function copyLink(page: BrandPage) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/brands/${page.slug}`
      );
      setCopied(page.id);
      setTimeout(() => setCopied((c) => (c === page.id ? null : c)), 1500);
    } catch {
      // Clipboard can be blocked; the link is still visible in the table.
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
          Admin
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-ink">Brand pages</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Public landing pages to link from outreach emails, e.g.
              &ldquo;Samsung ads&rdquo; at /brands/samsung.
            </p>
          </div>
          <Link
            href="/admin/brand-pages/new"
            className="bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground"
          >
            + New brand page
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading…
          </div>
        ) : error ? (
          <p className="mt-8 text-sm text-brand">{error}</p>
        ) : pages.length === 0 ? (
          <p className="mt-8 text-sm text-ink-muted">
            No brand pages yet. Create one to start linking it from emails.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto border-t border-ink/15">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/15 text-xs text-ink-muted">
                  <th className="py-3 pr-4 font-medium">Heading</th>
                  <th className="py-3 pr-4 font-medium">Link</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Updated</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id} className="border-b border-ink/10">
                    <td className="py-3 pr-4 font-bold text-ink">
                      <Link href={`/admin/brand-pages/${page.id}`}>
                        {page.heading}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-ink-muted">
                      /brands/{page.slug}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold ${
                          page.published
                            ? "bg-emerald-600/15 text-emerald-700"
                            : "bg-ink/10 text-ink-muted"
                        }`}
                      >
                        {page.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-ink-muted">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {page.published && (
                        <>
                          <button
                            type="button"
                            onClick={() => copyLink(page)}
                            className="mr-3 text-sm text-ink-muted hover:text-ink"
                          >
                            {copied === page.id ? "Copied!" : "Copy link"}
                          </button>
                          <a
                            href={`/brands/${page.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mr-3 text-sm text-ink-muted hover:text-ink"
                          >
                            View
                          </a>
                        </>
                      )}
                      <Link
                        href={`/admin/brand-pages/${page.id}`}
                        className="text-sm font-medium text-brand"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
