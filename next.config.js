/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    MUX_ACCESS_TOKEN_ID: process.env.MUX_ACCESS_TOKEN_ID,
    MUX_SECRET_KEY: process.env.MUX_SECRET_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    MUX_WEBHOOK_SIGNING_SECRET: process.env.MUX_WEBHOOK_SIGNING_SECRET,
  },
}

module.exports = nextConfig