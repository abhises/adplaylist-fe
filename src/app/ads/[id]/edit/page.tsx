"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AdEditor from "@/components/AdEditor";
import Spinner from "@/components/Spinner";
import { adToDraft, draftToAd, type AdDraft } from "@/lib/adDraft";
import { api, ApiError } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

// Step B for an ad that's already in the library: admins edit it in the same
// layout used to preview new ads, and "Save changes" updates it in place.
export default function EditAdPage({ params }: PageProps<"/ads/[id]/edit">) {
  const { id } = use(params);
  const { user, ready } = useRequireRole(["admin"]);
  const router = useRouter();

  const [draft, setDraft] = useState<AdDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => {
      setLoading(true);
      setNotFound(false);
      return api
        .getAd(id)
        .then(({ ad }) => setDraft(adToDraft(ad)))
        .catch((err) => {
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
        })
        .finally(() => setLoading(false));
    });
  }, [id, user]);

  if (!ready || !user) return null;
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="flex items-center gap-2 px-10 py-8 text-sm text-ink-muted">
          <Spinner />
          Loading ad…
        </div>
      </div>
    );
  }
  if (notFound || !draft) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="px-10 py-8">
          <p className="text-sm text-ink-muted">Ad not found.</p>
          <Link href="/library" className="mt-2 inline-block text-sm text-brand">
            &larr; Back to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdEditor
      initialDraft={draft}
      onSubmit={async (d) => {
        await api.updateAd(id, draftToAd(d));
        router.push(`/ads/${id}`);
      }}
      submitLabel="Save changes"
      submittingLabel="Saving…"
      backHref={`/ads/${id}`}
      backLabel="Back to ad"
      statusLabel="Editing · live in library"
    />
  );
}
