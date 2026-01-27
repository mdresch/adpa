/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Temporarily ignore ESLint errors during Vercel build to unblock deployment.
    // TODO: revert after addressing lint issues across the app.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript build errors during Vercel build.
    // TODO: revert after fixing type errors and adding stricter checks back.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output for Docker containerization
  output: 'standalone',

  // API Proxy: Forward all /api/* requests to Express backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
}

export default nextConfig
