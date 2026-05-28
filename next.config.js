/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Use standalone output for better Vercel compatibility
  output: 'standalone',
  
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
  
  // Ensure API routes are excluded from static generation
  exportPathMap: async function (defaultPathMap, { dev, dir, outDir, distDir, buildId }) {
    // Filter out API routes from static export
    const filteredPaths = {};
    for (const [path, page] of Object.entries(defaultPathMap)) {
      // Skip API routes - they should be serverless functions, not static pages
      if (!path.startsWith('/api/')) {
        filteredPaths[path] = page;
      }
    }
    return filteredPaths;
  },
};

module.exports = nextConfig;
