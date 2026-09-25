"use client";

import { useRouter } from "next/navigation";
import BlogPostEditor from "@/components/BlogPostEditor";
import { api } from "@/lib/api";
import { useRequirePermission } from "@/lib/AuthProvider";

export default function NewBlogPost() {
  const { user, ready } = useRequirePermission("blog");
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
