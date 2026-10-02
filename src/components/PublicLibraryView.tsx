"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LibraryView from "@/components/LibraryView";
import { useAuth } from "@/lib/AuthProvider";
import type { Ad } from "@/lib/api";
import { slugify } from "@/lib/slug";

// /library. Rendered for visitors on the server, so search engines get the
// whole library. Signed in, clients move on to their own branded library
// (/library/<name>) and staff get the app header and their controls.
export default function PublicLibraryView({
  ads,
  initialTags,
  initialQuery,
  initialCategory,
}: {
  ads: Ad[];
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

  if (isClient) return null;

  return (
    <LibraryView
      heading={ready && user ? "Explore Ads" : "Ads"}
      user={ready ? user : null}
      initialAds={ads}
      initialTags={initialTags}
      initialQuery={initialQuery}
      initialCategory={initialCategory}
    />
  );
}
