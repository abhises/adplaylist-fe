"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignInButton({
  onCredential,
  onError,
}: {
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Keep the latest callbacks in refs, rather than the effect's dependency
  // array, so a re-render of the parent (e.g. typing in a form field, which
  // recreates onCredential/onError) doesn't re-run google.accounts.id.initialize
  // — GSI warns and misbehaves when it's called more than once.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!scriptReady || !GOOGLE_CLIENT_ID) return;
    const el = buttonRef.current;
    const google = window.google;
    if (!el || !google) return;

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) {
          onCredentialRef.current(response.credential);
        } else {
          onErrorRef.current?.("Google sign-in failed.");
        }
      },
    });

    google.accounts.id.renderButton(el, {
      type: "standard",
      theme: "outline",
      size: "large",
      width: el.offsetWidth || 400,
      text: "continue_with",
    });
  }, [scriptReady]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={buttonRef} className="w-full" />
    </>
  );
}
