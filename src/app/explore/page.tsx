import { permanentRedirect } from "next/navigation";

// The public library moved to /library; keep old /explore links (and any
// search results) working, with filters.
export default async function ExploreRedirect({ searchParams }: PageProps<"/explore">) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : [value]) if (v !== undefined) params.append(key, v);
  }
  const qs = params.toString();
  permanentRedirect(`/library${qs ? `?${qs}` : ""}`);
}
