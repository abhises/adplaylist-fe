import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image (see Dockerfile) sets NEXT_STANDALONE=1 to get a
  // self-contained server in .next/standalone. Vercel builds stay as before.
  ...(process.env.NEXT_STANDALONE === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
