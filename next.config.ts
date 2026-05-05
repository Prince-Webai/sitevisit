import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'clhbnthrkfzdhtklwypi.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
