"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AdCard from "@/components/AdCard";
import { api, type Ad } from "@/lib/api";
import { useRequireAuth } from "@/lib/AuthProvider";

export default function SavedAdsPage() {
  const { user, ready } = useRequireAuth();
  const [savedAds, setSavedAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .getSaved()
      .then(({ ads }) => setSavedAds(ads))
      .finally(() => setLoading(false));
  }, [user]);

  async function removeAd(id: string) {
    setSavedAds((ads) => ads.filter((ad) => ad.id !== id));
    try {
      await api.unsaveAd(id);
    } catch {
      // ignore; a page refresh will resync
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <h1 className="text-3xl font-extrabold text-ink">My saved ads</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Ads you&rsquo;ve bookmarked for this quarter&rsquo;s campaigns.
          Saving never locks an ad &mdash; anyone on your team can still use
          it.
        </p>

        {loading && (
          <p className="mt-10 text-sm text-ink-muted">Loading saved ads…</p>
        )}

        {!loading && savedAds.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {savedAds.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                footer={
                  <button
                    onClick={() => removeAd(ad.id)}
                    className="mt-2 w-full border border-border py-1.5 text-sm font-bold text-ink"
                  >
                    Remove ad
                  </button>
                }
              />
            ))}
          </div>
        )}

        {!loading && savedAds.length === 0 && (
          <p className="mt-10 text-sm text-ink-muted">
            You haven&rsquo;t saved any ads yet.
          </p>
        )}
      </main>
    </div>
  );
}
