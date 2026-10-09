import LoadingScreen from "@/components/LoadingScreen";

// Shown straight away when opening an ad while the server fetches it.
export default function Loading() {
  return <LoadingScreen label="Loading ad…" />;
}
