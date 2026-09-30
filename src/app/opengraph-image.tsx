import { ImageResponse } from "next/og";

export const alt = "Adplaylist: your next ad is already made.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Shared preview for every page that doesn't set its own (blog posts use
// their cover image). Colors match the landing page.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#F3F2F0",
          color: "#161514",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700, color: "#EC3016", letterSpacing: 4 }}>
          ADPLAYLIST
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>
          Your next ad is already made.
        </div>
        <div style={{ fontSize: 32, color: "#55524e" }}>
          Ready-made ad creatives you can edit and launch in minutes.
        </div>
      </div>
    ),
    size
  );
}
