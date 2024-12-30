const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.mux.com',
      },
    ],
  },
  webpack: (config) => {
    config.externals = [...config.externals, { canvas: 'canvas' }];  // required by mux-player
    return config;
  },
};

module.exports = nextConfig;