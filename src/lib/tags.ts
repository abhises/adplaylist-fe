"use client";

import { useEffect, useState } from "react";
import { api, type Tag } from "@/lib/api";

// The tag list is shared by every tag picker on a page, so it's fetched once
// and kept here; addTag() and reloadTags() update it for all of them.
let cache: Tag[] | null = null;
let pending: Promise<Tag[]> | null = null;
const listeners = new Set<(tags: Tag[]) => void>();

function publish(tags: Tag[]) {
  cache = [...tags].sort((a, b) => a.name.localeCompare(b.name));
  listeners.forEach((fn) => fn(cache!));
}

export function reloadTags(): Promise<Tag[]> {
  pending = api
    .getTags()
    .then(({ tags }) => {
      publish(tags);
      return cache!;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export async function addTag(name: string): Promise<Tag> {
  const { tag } = await api.createTag(name);
  publish([...(cache ?? []), tag]);
  return tag;
}

export function useTags(): Tag[] | null {
  const [tags, setTags] = useState<Tag[] | null>(cache);
  useEffect(() => {
    listeners.add(setTags);
    if (!cache && !pending) reloadTags().catch(() => {});
    return () => {
      listeners.delete(setTags);
    };
  }, []);
  return tags;
}
