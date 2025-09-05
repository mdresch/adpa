/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output for Docker containerization
  output: 'standalone',
  // Enable experimental features for better serverless performance
  experimental: {
    serverComponentsExternalPackages: ['@vercel/postgres'],
  },
}

export default nextConfig
