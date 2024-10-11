const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['placeholder.com'],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      '@/components': path.resolve(__dirname, 'app/_components'),
      '@/hooks': path.resolve(__dirname, 'app/_hooks'),
      '@/lib': path.resolve(__dirname, 'app/_lib'),
      '@/styles': path.resolve(__dirname, 'app/styles'),
      '@/utils': path.resolve(__dirname, 'app/_utils'),
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  env: {
    MUX_ACCESS_TOKEN_ID: process.env.MUX_ACCESS_TOKEN_ID,
    MUX_SECRET_KEY: process.env.MUX_SECRET_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    MUX_WEBHOOK_SIGNING_SECRET: process.env.MUX_WEBHOOK_SIGNING_SECRET,
  },
};

module.exports = nextConfig;