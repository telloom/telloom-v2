const dotenv = require('dotenv');
dotenv.config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: true
  },
  images: {
    domains: ['placeholder.com'],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': resolve(__dirname),
      '@/components': resolve(__dirname, 'components'),
      '@/lib': resolve(__dirname, 'lib'),
      '@/styles': resolve(__dirname, 'styles'),
      '@/utils': resolve(__dirname, 'utils'),
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