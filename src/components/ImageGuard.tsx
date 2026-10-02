"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { can } from "@/lib/plans";

// Visitors and unpaid users can't right-click, drag or long-press ad
// creatives (images with the .ad-creative class) to save them; paid plans
// and staff can, as they download them clean anyway. The long-press and drag
// blocks are CSS in globals.css, on until this marks the page
// data-allow-save. This only stops casual saving: the image is still
// reachable from the browser's developer tools, and screenshots still work.
export default function ImageGuard() {
  const { user, ready } = useAuth();
  const allow = ready && can(user, "cleanDownload");

  useEffect(() => {
    const root = document.documentElement;
    if (allow) {
      root.dataset.allowSave = "";
      return () => {
        delete root.dataset.allowSave;
      };
    }
    const block = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(".ad-creative")) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, [allow]);

  return null;
}
