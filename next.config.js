const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(process.cwd()),
      '@/components': path.resolve(process.cwd(), 'components'),
      '@/hooks': path.resolve(process.cwd(), 'hooks'),
      '@/lib': path.resolve(process.cwd(), 'lib'),
      '@/styles': path.resolve(process.cwd(), 'app/styles'),
      '@/utils': path.resolve(process.cwd(), 'utils'),
      '@/app': path.resolve(process.cwd(), 'app'),
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  env: {
    MUX_ACCESS_TOKEN_ID: process.env.MUX_ACCESS_TOKEN_ID,
    MUX_SECRET_KEY: process.env.MUX_SECRET_KEY,
    MUX_WEBHOOK_SIGNING_SECRET: process.env.MUX_WEBHOOK_SIGNING_SECRET,
  },
};

module.exports = nextConfig;