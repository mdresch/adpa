# --- Build Stage ---
FROM node:20-slim AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY patches ./patches

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

# Copy workspace files for production install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY patches ./patches
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy built files and package.json from builder
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/tsconfig.json ./server/tsconfig.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/types ./types

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --prod --filter server...

EXPOSE 5000

# Use non-root user for security if possible, though Render handles some of this
# USER node

WORKDIR /app/server
CMD ["node", "-r", "tsconfig-paths/register", "dist/server/src/server.js"]
