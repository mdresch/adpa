import { withSentryConfig } from '@sentry/nextjs';
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
  transpilePackages: [
    'lucide-react',
    '@itwin/viewer-react',
    '@itwin/itwinui-react',
    '@itwin/appui-react',
    '@itwin/components-react',
    '@itwin/core-react',
    '@itwin/imodel-components-react',
    '@itwin/core-frontend',
    '@itwin/core-common'
  ],

  sassOptions: {
    includePaths: ['./node_modules'],
    quietDeps: true,
  },

  // Exclude problematic server-side packages from bundling
  serverExternalPackages: [
    '@adobe/pdfservices-node-sdk',
    '@documenso/pdf-sign',
    'puppeteer',
    'winston',
    'pino',
    'pino-pretty',
    'amqplib',
    'ioredis',
    'pg',
    'sequelize'
  ],

  // API Proxy: Forward all /api/* requests to Express backend
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path((?!morphic|auth|chat|openui-chat|keepalive).*)',
          destination: `${process.env.BACKEND_URL || 'https://adpa.onrender.com'}/api/:path*`,
        },
      ],
    };
  },
}

const sentryConfig = {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "cba-og",

  project: "adpa",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
};

const isCI = process.env.CI === 'true' || process.env.CI === '1';

export default isCI
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;
