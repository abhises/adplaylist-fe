"use client";

import { use, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import LibraryView from "@/components/LibraryView";
import { useRequireAuth } from "@/lib/AuthProvider";
import { slugify } from "@/lib/slug";

export default function ClientLibraryPage({
  searchParams,
}: PageProps<"/library/[client]">) {
  const { tag } = use(searchParams);
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ client: string }>();

  const expectedSlug = user ? slugify(user.fullName) : null;

  // This URL is just the client's own /library, branded with their name —
  // not a general lookup, so anything other than their own slug bounces to
  // the canonical one (or to plain /library for non-clients).
  useEffect(() => {
    if (!ready || !user) return;
    if (user.role !== "client") {
      router.replace("/library");
    } else if (params.client !== expectedSlug) {
      router.replace(`/library/${expectedSlug}`);
    }
  }, [ready, user, params.client, expectedSlug, router]);

  if (!ready || !user || user.role !== "client" || params.client !== expectedSlug) {
    return null;
  }

  return <LibraryView heading={user.fullName} user={user} initialTags={tag} />;
}
