/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // rebuild 2026-05-28
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
