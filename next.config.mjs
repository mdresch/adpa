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
  // Enable external packages for server components
  serverExternalPackages: ['@vercel/postgres'],
}

export default nextConfig
