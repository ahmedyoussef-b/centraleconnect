
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add this to allow cross-origin requests from the preview environment
  experimental: {
    allowedDevOrigins: ["https://*.cloudworkstations.dev"],
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
      config.externals.push('vosk-browser', '@ricky0123/vad-web', 'onnxruntime-web');
    }

    if (!isServer) {
      // This prevents webpack from trying to parse a library that uses dynamic requires.
      config.module.noParse = /ort\.min\.js/;
    }
    
    return config;
  },
};

export default nextConfig;
