import NextLink from "next/link";
import type { ComponentProps } from "react";

// next/link with hydration warnings muted for the <a>'s own attributes.
// Browser extensions (e.g. pdfFiller adds data-pdffiller-skip) stamp extra
// attributes onto links before React hydrates, which React reports as a
// server/client mismatch. This only covers the anchor's attributes, so real
// mismatches in its children are still reported. Use this instead of
// importing next/link directly.
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink suppressHydrationWarning {...props} />;
}
