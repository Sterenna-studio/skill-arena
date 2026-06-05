import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/arena',
  assetPrefix: '/arena',
  images: { unoptimized: true },
};

export default nextConfig;
