import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // appDir: true, // This line is already commented out
  },
  images: {
    domains: ['placeholder.com'], // Keep the existing image domain configuration
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