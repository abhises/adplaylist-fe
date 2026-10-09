import LoadingScreen from "@/components/LoadingScreen";

// Shown straight away when going to /library (or a client's library) while
// the server fetches the ads, instead of the previous page sitting still.
export default function Loading() {
  return <LoadingScreen label="Loading the ad library…" />;
}
