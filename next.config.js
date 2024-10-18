

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.',
      '@/components': './app/_components',
      '@/hooks': './app/_hooks',
      '@/lib': './app/_lib',
      '@/styles': './app/styles',
      '@/utils': './app/_utils',
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