/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Add cache-busting for builds
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  
  // Add headers for cache control
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Environment variables to expose to the browser
  env: {
    NEXT_PUBLIC_BUILD_TIME: Date.now().toString(),
  },
  
  // Configure webpack to add build timestamp
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new (require('webpack')).DefinePlugin({
          'process.env.NEXT_PUBLIC_BUILD_TIMESTAMP': JSON.stringify(Date.now()),
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
