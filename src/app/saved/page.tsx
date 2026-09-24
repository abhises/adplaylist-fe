"use client";

import { useEffect, useState } from "react";
import Link from "@/components/Link";
import AppHeader from "@/components/AppHeader";
import AdCard from "@/components/AdCard";
import Spinner from "@/components/Spinner";
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
          <div className="mt-10 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading saved ads…
          </div>
        )}

        {!loading && savedAds.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {savedAds.map((ad) => (
              <div
                key={ad.id}
                className="flex flex-col gap-3 border border-border p-3.5"
              >
                <AdCard ad={ad} />
                <button
                  onClick={() => removeAd(ad.id)}
                  className="mt-auto w-full border border-border py-1.5 text-left text-sm font-bold text-ink hover:bg-surface-2"
                >
                  Remove ad
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && savedAds.length === 0 && (
          <div className="mt-10 flex flex-col items-start gap-3 border-2 border-border p-10">
            <p className="text-2xl font-extrabold tracking-[-0.01em] text-ink">
              Nothing saved yet
            </p>
            <p className="max-w-[40em] text-sm leading-relaxed text-ink-muted">
              Open any ad and hit Save ad to keep it here — handy for building
              out a campaign before you start editing.
            </p>
            <Link
              href="/library"
              className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
            >
              Browse the library
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
