import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output only on VPS/self-hosted builds, NOT on Vercel.
  // The packaging script (scripts/package-for-client.sh) sets NEXT_BUILD_STANDALONE=1.
  ...(process.env.NEXT_BUILD_STANDALONE === "1" ? { output: "standalone" } : {}),

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
