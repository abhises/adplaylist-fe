"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import LibraryView from "@/components/LibraryView";
import { useRequireAuth } from "@/lib/AuthProvider";
import { slugify } from "@/lib/slug";

export default function LibraryPage({ searchParams }: PageProps<"/library">) {
  const { tag } = use(searchParams);
  const { user, ready } = useRequireAuth();
  const router = useRouter();

  // Clients get a dedicated, name-branded URL instead of the bare /library
  // designers and admins use.
  useEffect(() => {
    if (ready && user?.role === "client") {
      router.replace(`/library/${slugify(user.fullName)}`);
    }
  }, [ready, user, router]);

  if (!ready || !user || user.role === "client") return null;

  return <LibraryView heading="Explore Ads" user={user} initialTags={tag} />;
}
