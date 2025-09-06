# ADPA Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Skip TypeScript build for now - run directly with tsx
# RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 adpa

# Copy source code instead of built dist
COPY --from=builder --chown=adpa:nodejs /app/src ./src
COPY --from=builder --chown=adpa:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=adpa:nodejs /app/package.json ./
COPY --from=builder --chown=adpa:nodejs /app/tsconfig.json ./

# Create uploads and logs directories
# Create uploads directory
RUN mkdir -p uploads logs && chown -R adpa:nodejs uploads logs

USER adpa

EXPOSE 5000

ENV PORT 5000
ENV HOSTNAME "0.0.0.0"

CMD ["npx", "tsx", "src/server.ts"]
