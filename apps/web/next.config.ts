import type { NextConfig } from "next";

const apiOrigin = process.env.YURBRAIN_API_ORIGIN ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@yurbrain/ui"],
  async rewrites() {
    return [
      { source: "/brain-items/:path*", destination: `${apiOrigin}/brain-items/:path*` },
      { source: "/feed/:path*", destination: `${apiOrigin}/feed/:path*` },
      { source: "/threads/:path*", destination: `${apiOrigin}/threads/:path*` },
      { source: "/messages/:path*", destination: `${apiOrigin}/messages/:path*` },
      { source: "/preferences/:path*", destination: `${apiOrigin}/preferences/:path*` },
      { source: "/tasks/:path*", destination: `${apiOrigin}/tasks/:path*` },
      { source: "/sessions/:path*", destination: `${apiOrigin}/sessions/:path*` },
      { source: "/ai/:path*", destination: `${apiOrigin}/ai/:path*` }
    ];
  }
};

export default nextConfig;
