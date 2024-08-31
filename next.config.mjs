import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // appDir: true, // Remove or comment out this line
  },
  images: {
    domains: ['placeholder.com'], // Add domains for external images here
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
};

export default nextConfig;