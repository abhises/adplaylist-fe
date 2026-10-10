"use client";

import { useState } from "react";

// A video ad's creative. It never plays by itself: the cover is shown with
// a play button, and the video is only loaded once that's clicked. Fills
// its (relative) parent, like the image it stands in for.
export default function VideoCreative({
  src,
  cover,
  alt,
  width,
  height,
}: {
  src: string;
  cover?: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  // Keyed by the video, so a replaced video goes back to its cover.
  const [playing, setPlaying] = useState<string | null>(null);

  if (playing === src) {
    return (
      <video
        src={src}
        poster={cover}
        controls
        autoPlay
        playsInline
        // No download button in the player: the Download button applies the
        // plan's rules.
        controlsList="nodownload"
        className="ad-creative absolute inset-0 h-full w-full bg-black object-contain"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(src)}
      aria-label="Play video"
      className="group/play absolute inset-0 h-full w-full cursor-pointer bg-black"
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={alt}
          width={width}
          height={height}
          fetchPriority="high"
          className="ad-creative absolute inset-0 h-full w-full object-contain"
        />
      )}
      <span className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-transform group-hover/play:scale-110">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden>
          <path d="M8 5v14l11-7Z" />
        </svg>
      </span>
    </button>
  );
}
