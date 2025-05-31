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
  // Add webpack configuration here
  webpack: (config, { isServer }) => {
    // Fix for 'async_hooks' issue with OpenTelemetry in Next.js App Router client components
    // See: https://github.com/open-telemetry/opentelemetry-js/issues/4173
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false, // Exclude 'async_hooks' from client bundle
      };
    }

    // Important: return the modified config
    return config;
  },
  experimental: {
    turbo: {}, // Add empty turbo configuration to acknowledge Turbopack
  },
};

export default nextConfig;
