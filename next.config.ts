import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Proxy/middleware request body clone limit (default 10mb in Next 16).
    // Keep this aligned with serverActions.bodySizeLimit for large Excel uploads.
    proxyClientMaxBodySize: '40mb',
    serverActions: {
      bodySizeLimit: '40mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
