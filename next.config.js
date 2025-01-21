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
      {
        protocol: 'https',
        hostname: 'edplarkcaozwrivolfgw.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'canvas'];
    return config;
  },
};

module.exports = nextConfig;