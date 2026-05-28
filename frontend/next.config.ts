import type { NextConfig } from 'next';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/socket.io',
          destination: `${backendUrl}/socket.io/`,
        },
        {
          source: '/socket.io/:path*',
          destination: `${backendUrl}/socket.io/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
      { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/uploads/**' },
    ],
  },
};

export default nextConfig;
