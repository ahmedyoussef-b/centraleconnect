/** @type {import('next').NextConfig} */

const fs = require('fs');
const path = require('path');

// Read package.json to get the version
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const appVersion = packageJson.version;

const isTauriBuild = process.env.TAURI_BUILD === 'true';

const nextConfig = {
  output: isTauriBuild ? 'export' : undefined,
  env: {
    APP_VERSION: appVersion,
    BUILD_TIME: new Date().toISOString(),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
      buffer: require.resolve('buffer'),
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

module.exports = nextConfig;
