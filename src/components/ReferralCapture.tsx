"use client";

import { useEffect } from "react";
import { isReferralCode, rememberReferralCode } from "@/lib/referral";

// Remembers the code when a visitor arrives through a referral link
// (any page with ?ref=<code>), for when they sign up.
export default function ReferralCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
    if (code && isReferralCode(code)) rememberReferralCode(code);
  }, []);
  return null;
}
