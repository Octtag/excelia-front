import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'simplepassbucket.s3.amazonaws.com',
        pathname: '/img/**',
      },
    ],
  },
};

export default nextConfig;
