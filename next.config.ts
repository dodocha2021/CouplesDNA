import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,  // ✅ 添加这行
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
    allowedDevOrigins: [
        '3000-firebase-couplesdna-1758776227643.cluster-igoqaqpofbdxiwb7tjmkpssdzc.cloudworkstations.dev'
    ]
  }
};

export default nextConfig;