"use client";

import { useRouter } from "next/navigation";
import BlogPostEditor from "@/components/BlogPostEditor";
import { api } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

export default function NewBlogPost() {
  const { user, ready } = useRequireRole(["admin"]);
  const router = useRouter();

  if (!ready || !user) return null;

  return (
    <BlogPostEditor
      onSave={async (data) => {
        const { post } = await api.createBlogPost(data);
        router.replace(`/admin/blog/${post.id}`);
      }}
    />
  );
}
