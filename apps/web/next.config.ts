import type { NextConfig } from "next";

const apiOrigin = process.env.YURBRAIN_API_ORIGIN ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@yurbrain/ui"],
  async rewrites() {
    return [
      { source: "/auth/:path*", destination: `${apiOrigin}/auth/:path*` },
      { source: "/capture/:path*", destination: `${apiOrigin}/capture/:path*` },
      { source: "/brain-items/:path*", destination: `${apiOrigin}/brain-items/:path*` },
      { source: "/feed/:path*", destination: `${apiOrigin}/feed/:path*` },
      { source: "/founder-review", destination: `${apiOrigin}/functions/founder-review` },
      { source: "/functions/:path*", destination: `${apiOrigin}/functions/:path*` },
      { source: "/threads/:path*", destination: `${apiOrigin}/threads/:path*` },
      { source: "/messages/:path*", destination: `${apiOrigin}/messages/:path*` },
      { source: "/preferences/:path*", destination: `${apiOrigin}/preferences/:path*` },
      { source: "/tasks/:path*", destination: `${apiOrigin}/tasks/:path*` },
      { source: "/sessions/:path*", destination: `${apiOrigin}/sessions/:path*` },
      { source: "/explore/:path*", destination: `${apiOrigin}/explore/:path*` },
      { source: "/ai/:path*", destination: `${apiOrigin}/ai/:path*` },
      { source: "/health/:path*", destination: `${apiOrigin}/health/:path*` },
      { source: "/events", destination: `${apiOrigin}/events` }
    ];
  }
};

export default nextConfig;
