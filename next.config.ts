
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    turbo: {
      // Configure Turbopack's resolver for fallbacks
      resolveFallback: {
        // This mimics the behavior of the previous Webpack config:
        // Exclude 'async_hooks' from client bundle for OpenTelemetry compatibility
        "async_hooks": false,
      }
    },
  },
};

export default nextConfig;
