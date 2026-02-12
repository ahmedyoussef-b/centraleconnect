
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ]
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // This is needed to prevent errors from `vosk-browser` which tries to import 'fs' and 'worker_threads'
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      worker_threads: false,
    };

    if (isServer) {
      // Exclude problematic client-side libraries from server-side compilation
      config.externals.push('vosk-browser');
    }

    config.module.rules.push({
      test: /\.bin$/,
      type: 'asset/resource',
    });
    
    return config;
  },
};

export default nextConfig;
