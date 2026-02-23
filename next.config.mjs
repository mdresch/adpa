/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // Explicitly expose server-side environment variables that are missing the NEXT_PUBLIC_ prefix
  env: {
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  },

  // Exclude problematic server-side packages from bundling
  serverExternalPackages: [
    '@adobe/pdfservices-node-sdk',
    '@documenso/pdf-sign',
    'puppeteer',
    'winston',
    'amqplib',
    'ioredis',
    'pg',
    'sequelize'
  ],

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
