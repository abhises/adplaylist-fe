"use client";

import { useEffect, useState } from "react";
import Link from "@/components/Link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AdEditor from "@/components/AdEditor";
import {
  clearDraft,
  draftToAd,
  loadDraft,
  saveDraft,
  type AdDraft,
} from "@/lib/adDraft";
import { api } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

// Step B for a new ad: nothing is saved to the backend until
// "Publish to library" is pressed. Edits are kept in sessionStorage so
// "Back to edit" and a page refresh both keep the designer's changes.
export default function AdPreviewPage() {
  const { user, ready } = useRequireRole(["designer", "admin"]);
  const router = useRouter();

  const [draft, setDraft] = useState<AdDraft | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setDraft(loadDraft());
      setLoaded(true);
    });
  }, []);

  if (!ready || !user || !loaded) return null;
  if (!draft) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="px-10 py-8">
          <p className="text-sm text-ink-muted">Nothing to preview yet.</p>
          <Link href="/add-ad" className="mt-2 inline-block text-sm text-brand">
            &larr; Add a new ad
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdEditor
      initialDraft={draft}
      onDraftChange={saveDraft}
      onSubmit={async (d) => {
        const { ad } = await api.createAd(draftToAd(d));
        clearDraft();
        router.push(`/ads/${ad.id}`);
      }}
      submitLabel="Publish to library"
      submittingLabel="Publishing…"
      backHref="/add-ad"
      backLabel="Back to edit"
      statusLabel="Preview · not published"
    />
  );
}
