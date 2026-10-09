"use server";

import { updateTag } from "next/cache";
import { LIBRARY_ADS_TAG } from "@/lib/api";

// Called after an admin adds, edits or deletes an ad (or renames or deletes
// a tag), so the cached ad list behind /library and ad pages is fetched
// fresh on the next visit instead of showing the old list once more.
export async function refreshLibraryAds() {
  updateTag(LIBRARY_ADS_TAG);
}
