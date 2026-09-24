"use client";

import { use, useEffect, useState } from "react";
import Link from "@/components/Link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BrandPageEditor from "@/components/BrandPageEditor";
import ConfirmDialog from "@/components/ConfirmDialog";
import Spinner from "@/components/Spinner";
import { api, ApiError, type BrandPage } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

export default function EditBrandPage({
  params,
}: PageProps<"/admin/brand-pages/[id]">) {
  const { id } = use(params);
  const { user, ready } = useRequireRole(["admin"]);
  const router = useRouter();

  const [page, setPage] = useState<BrandPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => {
      setLoading(true);
      return api
        .getBrandPage(Number(id))
        .then((res) => setPage(res.page))
        .catch((err) => {
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
        })
        .finally(() => setLoading(false));
    });
  }, [id, user]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteBrandPage(Number(id));
      router.replace("/admin/brand-pages");
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (!ready || !user) return null;
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="flex items-center gap-2 px-10 py-8 text-sm text-ink-muted">
          <Spinner />
          Loading page…
        </div>
      </div>
    );
  }
  if (notFound || !page) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="px-10 py-8">
          <p className="text-sm text-ink-muted">Page not found.</p>
          <Link
            href="/admin/brand-pages"
            className="mt-2 inline-block text-sm text-brand"
          >
            &larr; Brand pages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <BrandPageEditor
        key={page.id}
        initial={page}
        onSave={async (data) => {
          const res = await api.updateBrandPage(page.id, data);
          setPage(res.page);
          setSavedAt(new Date());
        }}
        onDelete={() => setConfirmDelete(true)}
      />
      {savedAt && (
        <div
          role="status"
          className="fixed right-6 bottom-6 bg-ink px-4 py-2 text-sm text-surface shadow-lg"
        >
          Saved {savedAt.toLocaleTimeString()}
          {page.published && (
            <>
              {" · "}
              <a
                href={`/brands/${page.slug}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                View live page
              </a>
            </>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete brand page"
        message={
          <>
            Delete <strong className="text-ink">{page.heading}</strong>? Its
            link will stop working. This can&rsquo;t be undone.
          </>
        }
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
