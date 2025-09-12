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
  // `serverExternalPackages` is no longer a recognized Next.js config key in
  // the currently used Next.js version. If you need to mark certain packages
  // as external for the server build (for example when using @vercel/postgres
  // or native modules), handle that in your bundler configuration or use
  // next-transpile-modules / webpack externals as appropriate.
  // Removed serverExternalPackages to silence Next.js warnings.
}

export default nextConfig
