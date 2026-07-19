# --- Build Stage ---
FROM node:20-slim AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json .npmrc ./
COPY patches ./patches
COPY scripts ./scripts

# Copy source code (Backend requires lib and types)
COPY lib ./lib
COPY types ./types
COPY server ./server

# Install all dependencies (including devDependencies for build)
RUN pnpm install --no-frozen-lockfile --filter server...

# Build the backend
WORKDIR /app/server
RUN pnpm build

# --- Production Stage ---
FROM node:20-slim AS runner

WORKDIR /app

# Install pnpm for production install
RUN npm install -g pnpm

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Puppeteer's own Chromium download is skipped (server/.npmrc: PUPPETEER_SKIP_DOWNLOAD=true),
# so the runner image needs a system Chromium plus its shared-library deps -- without this,
# PDF/DOCX export (pdfService.ts) has no browser to launch at all, not just "commonly missing" one.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy workspace files for production install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY patches ./patches
COPY scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy built files and package.json from builder
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/tsconfig.json ./server/tsconfig.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/types ./types

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --prod --filter server...

# Drop privileges for runtime security
RUN chown -R node:node /app
USER node

EXPOSE 5000

WORKDIR /app/server
CMD ["node", "-r", "tsconfig-paths/register", "dist/server/src/server.js"]
