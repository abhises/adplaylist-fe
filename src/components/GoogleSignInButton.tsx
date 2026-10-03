"use client";

import Script from "next/script";
import { useEffect, useRef, useState, type ReactNode } from "react";

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
  children,
}: {
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
  // A custom-styled button to show instead of Google's. Google's own button
  // (capped at 400px wide) is still rendered on top of it, invisible and
  // stretched to cover it, so clicks still go through GSI.
  children?: ReactNode;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scale, setScale] = useState<[number, number]>([1, 1]);
  const overlay = Boolean(children);

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
      width: overlay ? 400 : el.offsetWidth || 400,
      text: "continue_with",
    });
  }, [scriptReady, overlay]);

  // Stretch the invisible GSI button (rendered at a fixed 400x40, the "large"
  // size) over the custom one as it resizes.
  useEffect(() => {
    if (!overlay) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () =>
      setScale([wrapper.offsetWidth / 400, wrapper.offsetHeight / 40]);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [overlay]);

  if (!GOOGLE_CLIENT_ID) return null;

  if (overlay) {
    return (
      <>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
        />
        <div ref={wrapperRef} className="relative w-full overflow-hidden">
          {children}
          <div
            ref={buttonRef}
            className="absolute top-0 left-0 h-10 w-[400px] opacity-[0.01]"
            style={{
              transform: `scale(${scale[0]}, ${scale[1]})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      </>
    );
  }

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
