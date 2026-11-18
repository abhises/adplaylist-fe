// "More like this" and previous/next for an ad's page. Run on the server
// with the whole library, so only the handful of picked ads reach the
// browser.
import { adMarkets } from "@/lib/ads";
import type { Ad } from "@/lib/api";
import { adCategories } from "@/lib/categories";

function sharedTagCount(a: Ad, b: Ad) {
  const tagsA = new Set((a.tags ?? []).map((t) => t.toLowerCase()));
  return (b.tags ?? []).filter((t) => tagsA.has(t.toLowerCase())).length;
}

function sharesCategory(a: Ad, b: Ad) {
  const theirs = adCategories(b);
  return adCategories(a).some((c) => theirs.includes(c));
}

// How alike two ads are for "More like this": each shared tag counts 2, the
// same category and the same market 1 each.
function similarity(a: Ad, b: Ad) {
  return (
    sharedTagCount(a, b) * 2 +
    (sharesCategory(a, b) ? 1 : 0) +
    (adMarkets(a).some((m) => adMarkets(b).includes(m)) ? 1 : 0)
  );
}

// The ads under "More … ads like this": the ones picked in the ad's CSV, else
// the most similar. Ads with nothing in common beyond the market aren't
// "like this", so an automatic pick needs a shared tag or the same category.
export function relatedAds(ad: Ad, allAds: Ad[]) {
  const picked = (ad.content?.relatedAds ?? [])
    .map((slug) => allAds.find((a) => a.id === slug))
    .filter((a): a is Ad => !!a && a.id !== ad.id);
  if (picked.length) return picked.slice(0, 4);
  return allAds
    .filter((a) => a.id !== ad.id)
    .map((a) => ({ a, score: similarity(ad, a), shared: sharedTagCount(ad, a) }))
    .filter(({ a, shared }) => shared > 0 || sharesCategory(a, ad))
    // On a tie, the ad sharing more tags wins: a tag is more specific than a
    // category or market.
    .sort((x, y) => y.score - x.score || y.shared - x.shared)
    .slice(0, 4)
    .map(({ a }) => a);
}

// The ads before and after this one in library order.
export function adNeighbors(ad: Ad, allAds: Ad[]) {
  const index = allAds.findIndex((a) => a.id === ad.id);
  return {
    prevAd: index > 0 ? allAds[index - 1] : null,
    nextAd: index >= 0 && index < allAds.length - 1 ? allAds[index + 1] : null,
  };
}
