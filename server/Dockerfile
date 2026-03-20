# Use Node.js LTS image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY patches ./patches

# Copy shared lib and types (required for the backend)
COPY lib ./lib
COPY types ./types

# Copy backend package and source
COPY server ./server

# Install dependencies (only for backend)
RUN pnpm install --frozen-lockfile --filter server...

# Build the backend
WORKDIR /app/server
RUN pnpm build

# Expose backend port
EXPOSE 5000

# Start production server
CMD ["pnpm", "start"]
