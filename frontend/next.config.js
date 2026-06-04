/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    forceSwcTransforms: false,
  },
  swcMinify: false,
}

module.exports = nextConfig