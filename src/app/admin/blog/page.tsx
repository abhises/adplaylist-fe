"use client";

import { useEffect, useState } from "react";
import Link from "@/components/Link";
import AppHeader from "@/components/AppHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import Spinner from "@/components/Spinner";
import { formatPostDate } from "@/components/BlogLayout";
import { api, ApiError, type BlogPost } from "@/lib/api";
import { useRequirePermission } from "@/lib/AuthProvider";

export default function BlogPostsList() {
  const { user, ready } = useRequirePermission("blog");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() =>
      api
        .getBlogPosts()
        .then((res) => setPosts(res.posts))
        .catch(() => setError("Couldn't load blog posts."))
        .finally(() => setLoading(false))
    );
  }, [user]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteBlogPost(id);
      setPosts((list) => list.filter((p) => p.id !== id));
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : "Couldn't delete that post."
      );
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
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
            <h1 className="text-3xl font-extrabold text-ink">Blog</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Posts for the public blog at{" "}
              <a href="/blog" target="_blank" rel="noreferrer" className="text-brand">
                /blog
              </a>
              . Drafts stay hidden until published.
            </p>
          </div>
          <Link
            href="/admin/blog/new"
            className="bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground"
          >
            + New post
          </Link>
        </div>

        {deleteError && (
          <p className="mt-4 text-sm text-brand" role="alert">
            {deleteError}
          </p>
        )}

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading…
          </div>
        ) : error ? (
          <p className="mt-8 text-sm text-brand">{error}</p>
        ) : posts.length === 0 ? (
          <p className="mt-8 text-sm text-ink-muted">
            No posts yet. Write the first one.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto border-t border-ink/15">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/15 text-xs text-ink-muted">
                  <th className="py-3 pr-4 font-medium">Title</th>
                  <th className="py-3 pr-4 font-medium">Link</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Published</th>
                  <th className="py-3 pr-4 font-medium">Updated</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-ink/10">
                    <td className="py-3 pr-4 font-bold text-ink">
                      <Link href={`/admin/blog/${post.id}`}>{post.title}</Link>
                    </td>
                    <td className="py-3 pr-4 text-ink-muted">/blog/{post.slug}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold ${
                          post.published
                            ? "bg-emerald-600/15 text-emerald-700"
                            : "bg-ink/10 text-ink-muted"
                        }`}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-ink-muted">
                      {post.published ? formatPostDate(post.publishedAt) : "—"}
                    </td>
                    <td className="py-3 pr-4 text-ink-muted">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {post.published && (
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mr-3 text-sm text-ink-muted hover:text-ink"
                        >
                          View
                        </a>
                      )}
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="mr-3 text-sm font-medium text-brand"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(post)}
                        className="text-sm text-ink-muted hover:text-brand"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete blog post"
        message={
          deleteTarget && (
            <>
              Delete <strong className="text-ink">{deleteTarget.title}</strong>?
              {deleteTarget.published && " Its link will stop working."} This
              can&rsquo;t be undone.
            </>
          )
        }
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
