"use client";

import { use, useEffect, useState } from "react";
import Link from "@/components/Link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BlogPostEditor from "@/components/BlogPostEditor";
import ConfirmDialog from "@/components/ConfirmDialog";
import Spinner from "@/components/Spinner";
import { api, ApiError, type BlogPost } from "@/lib/api";
import { useRequirePermission } from "@/lib/AuthProvider";

export default function EditBlogPost({
  params,
}: PageProps<"/admin/blog/[id]">) {
  const { id } = use(params);
  const { user, ready } = useRequirePermission("blog");
  const router = useRouter();

  const [post, setPost] = useState<BlogPost | null>(null);
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
        .getBlogPost(Number(id))
        .then((res) => setPost(res.post))
        .catch((err) => {
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
        })
        .finally(() => setLoading(false));
    });
  }, [id, user]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteBlogPost(Number(id));
      router.replace("/admin/blog");
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
          Loading post…
        </div>
      </div>
    );
  }
  if (notFound || !post) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="px-10 py-8">
          <p className="text-sm text-ink-muted">Post not found.</p>
          <Link
            href="/admin/blog"
            className="mt-2 inline-block text-sm text-brand"
          >
            &larr; Blog posts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <BlogPostEditor
        key={post.id}
        initial={post}
        onSave={async (data) => {
          const res = await api.updateBlogPost(post.id, data);
          setPost(res.post);
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
          {post.published && (
            <>
              {" · "}
              <a
                href={`/blog/${post.slug}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                View live post
              </a>
            </>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete blog post"
        message={
          <>
            Delete <strong className="text-ink">{post.title}</strong>? Its
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
