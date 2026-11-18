"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LibraryView from "@/components/LibraryView";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/lib/AuthProvider";
import type { LibraryPage } from "@/lib/api";
import { slugify } from "@/lib/slug";

// Rows-per-page choices on the public library only; the first is the default.
const PUBLIC_PAGE_SIZE_OPTIONS = [20, 40];

// /library. Its first page is rendered for visitors on the server, so
// search engines see the grid. Signed in, clients move on to their own branded library
// (/library/<name>) and staff get the app header and their controls.
export default function PublicLibraryView({
  page,
  seed,
  initialTags,
  initialQuery,
  initialCategory,
}: {
  page?: LibraryPage;
  seed: number;
  initialTags?: string | string[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const isClient = ready && user?.role === "client";

  useEffect(() => {
    if (isClient && user) {
      const params = new URLSearchParams();
      (Array.isArray(initialTags) ? initialTags : initialTags ? [initialTags] : []).forEach((t) =>
        params.append("tag", t)
      );
      if (initialQuery) params.set("q", initialQuery);
      if (initialCategory) params.set("category", initialCategory);
      const qs = params.toString();
      router.replace(`/library/${slugify(user.fullName)}${qs ? `?${qs}` : ""}`);
    }
  }, [isClient, user, initialTags, initialQuery, initialCategory, router]);

  // Clients are on their way to their own library.
  if (isClient) return <LoadingScreen label="Loading your library…" />;

  return (
    <LibraryView
      heading="Explore Ads"
      user={ready ? user : null}
      initialPage={page}
      seed={seed}
      initialTags={initialTags}
      initialQuery={initialQuery}
      initialCategory={initialCategory}
      pageSizeOptions={PUBLIC_PAGE_SIZE_OPTIONS}
    />
  );
}
