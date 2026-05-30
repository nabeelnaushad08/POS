import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone mode creates a self-contained output that can be deployed anywhere
  // Remove this if deploying on Vercel (Vercel handles it automatically)
  // output: "standalone",  // Uncomment for VPS/self-hosted deployments

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
