import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config();

const nextFilename = fileURLToPath(import.meta.url);
const nextDirname = dirname(nextFilename);

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
      '@': resolve(nextDirname),
      '@/components': resolve(nextDirname, 'components'),
      '@/lib': resolve(nextDirname, 'lib'),
      '@/styles': resolve(nextDirname, 'styles'),
      '@/utils': resolve(nextDirname, 'utils'),
    };
    return config;
  },
};

export default nextConfig;