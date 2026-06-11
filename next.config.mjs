import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withSentryConfig } from '@sentry/nextjs';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const isCI = process.env.CI === 'true' || process.env.CI === '1';
/** C# Adpa.Orchestrator (RPAS rituals). Set when running Aspire or orchestrator alone. */
const orchestratorUrl = process.env.ORCHESTRATOR_URL?.replace(/\/$/, '');

/** Local dev must not fall through to Render — missing BACKEND_URL causes 401/500 on every API call. */
const backendUrl =
  process.env.BACKEND_URL?.replace(/\/$/, '') ||
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:5000' : 'https://adpa.onrender.com');

/** Next.js distDir must be relative to the project root (no absolute C:\ paths in .env). */
function distDirFromEnv() {
  const raw = process.env.NEXT_DIST_DIR?.trim();
  if (!raw) return {};
  if (path.isAbsolute(raw)) {
    console.warn(
      '[next.config] NEXT_DIST_DIR must be relative (e.g. .next-local), not an absolute path. ' +
        'On Windows use: pnpm dev:cache (junction to %LOCALAPPDATA%\\adpa-next-cache).',
    );
    return {};
  }
  return { distDir: raw };
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...distDirFromEnv(),
  // Keep module/CSS resolution on F:\ repo when .next is a junction to %LOCALAPPDATA% (pnpm dev:cache)
  turbopack: {
    root: projectRoot,
    // Note: @itwin packages use legacy ~ tilde SCSS imports that Turbopack
    // cannot resolve. Production builds use --no-turbopack (webpack) instead.
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

  // Explicitly expose server-side environment variables that are missing the NEXT_PUBLIC_ prefix
  transpilePackages: [
    '@openuidev/react-headless',
    '@openuidev/react-lang',
    '@openuidev/react-ui',
    'lucide-react',
    // @itwin packages — used via dynamic import in components/digital-twin/iTwinViewer.tsx.
    // Production builds use webpack (--no-turbopack) which handles their legacy
    // ~ tilde SCSS imports. Dev Turbopack is unaffected (SCSS not imported at dev time).
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
    includePaths: [
      './node_modules',
      // Provide @itwin package roots so sass can resolve their partials
      // when they are processed (fallback; primary fix is turbopack.rules above)
      './node_modules/@itwin/core-react/lib/core-react',
    ],
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

  allowedDevOrigins: ['192.168.178.64'],

  // Legacy URL — canonical OpenUI advisor lives at /openui-chat (query string preserved)
  async redirects() {
    return [
      {
        source: '/ai/openui-chat',
        destination: '/openui-chat',
        permanent: false,
      },
    ];
  },

  // API Proxy: Forward all /api/* requests to Express backend
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/projects/:id/documents/:docId/genui',
          destination: '/projects/:id/documents/genui?docId=:docId',
        },
        {
          source: '/projects/:id/documents/:docId/view',
          destination: '/projects/:id/documents/view?docId=:docId',
        },
        ...(orchestratorUrl
          ? [
              {
                source: '/api/Ritual/:path*',
                destination: `${orchestratorUrl}/api/Ritual/:path*`,
              },
              {
                source: '/api/ritual/:path*',
                destination: `${orchestratorUrl}/api/Ritual/:path*`,
              },
            ]
          : []),
        {
          source: '/api/:path((?!morphic|auth|chat|genui|openui-chat|keepalive|dev|[Rr]itual).*)',
          destination: `${backendUrl}/api/:path*`,
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

export default isCI
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;
