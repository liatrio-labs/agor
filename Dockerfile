# Production Dockerfile for Agor
# Optimized for Railway deployment with multi-stage build
FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
  sqlite3 \
  git \
  curl \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@9.15.1

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY packages/core/package.json ./packages/core/
COPY apps/agor-daemon/package.json ./apps/agor-daemon/
COPY apps/agor-ui/package.json ./apps/agor-ui/

# Install dependencies (frozen lockfile for reproducible builds)
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY packages ./packages
COPY apps/agor-daemon ./apps/agor-daemon
COPY apps/agor-ui ./apps/agor-ui

# Build stage
FROM base AS builder

# Build core package first (required by daemon and UI)
RUN pnpm --filter @agor/core build

# Build daemon
RUN pnpm --filter @agor/daemon build

# Build UI for production with correct base path
ENV NODE_ENV=production
RUN pnpm --filter agor-ui build

# Production stage
FROM node:20-slim AS production

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
  sqlite3 \
  git \
  curl \
  ca-certificates \
  gosu \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm globally first (needed for AI CLI installations)
RUN npm install -g pnpm@9.15.1

# Install AI coding agent CLIs globally
# These are required for Agor to run AI coding sessions
RUN npm install -g \
  @anthropic-ai/claude-code@latest \
  @openai/codex@latest \
  @google/gemini-cli@latest

# Install GitHub CLI (gh) for git operations
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update \
  && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1001 agor

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=agor:agor package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=agor:agor turbo.json ./
COPY --chown=agor:agor packages/core/package.json ./packages/core/
COPY --chown=agor:agor apps/agor-daemon/package.json ./apps/agor-daemon/
COPY --chown=agor:agor apps/agor-ui/package.json ./apps/agor-ui/

# Install production dependencies only
# Skip prepare scripts (husky) with --ignore-scripts, then run specific postinstall scripts we need
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts from builder
COPY --from=builder --chown=agor:agor /app/packages/core/dist ./packages/core/dist
COPY --from=builder --chown=agor:agor /app/apps/agor-daemon/dist ./apps/agor-daemon/dist

# Copy UI build to where daemon expects it (daemon looks for ../ui relative to dist/index.js)
# Daemon is at: apps/agor-daemon/dist/index.js
# So UI should be at: apps/agor-daemon/ui/
COPY --from=builder --chown=agor:agor /app/apps/agor-ui/dist ./apps/agor-daemon/ui

# Copy package.json files needed at runtime
COPY --from=builder --chown=agor:agor /app/packages/core/package.json ./packages/core/
COPY --from=builder --chown=agor:agor /app/apps/agor-daemon/package.json ./apps/agor-daemon/

# Create .agor directory with proper permissions
RUN mkdir -p /home/agor/.agor && chown -R agor:agor /home/agor/.agor

# Create agent data directories in persistent volume
# These will be symlinked from home directory to ensure persistence
RUN mkdir -p /home/agor/.agor/.claude \
             /home/agor/.agor/.codex \
             /home/agor/.agor/.gemini && \
    chown -R agor:agor /home/agor/.agor

# Create production entrypoint script
# Note: This runs as root to fix volume permissions, then switches to agor user
COPY <<'EOF' /usr/local/bin/docker-entrypoint-prod.sh
#!/bin/sh
set -e

echo "🚀 Starting Agor production server..."

# Fix volume permissions (Railway mounts volumes as root)
# This must run as root before switching to agor user
echo "🔧 Fixing volume permissions..."
mkdir -p /home/agor/.agor
chown -R agor:agor /home/agor/.agor
echo "✅ Volume permissions fixed"

# Create agent session directories in persistent volume
# This ensures agent conversations survive container restarts/deploys
echo "📁 Setting up agent session storage..."
mkdir -p /home/agor/.agor/.claude \
         /home/agor/.agor/.codex \
         /home/agor/.agor/.gemini
chown -R agor:agor /home/agor/.agor

# Create symlinks from home directory to persistent volume
# This ensures CLIs store data in the persistent volume
if [ ! -L /home/agor/.claude ]; then
  rm -rf /home/agor/.claude
  ln -s /home/agor/.agor/.claude /home/agor/.claude
fi

if [ ! -L /home/agor/.codex ]; then
  rm -rf /home/agor/.codex
  ln -s /home/agor/.agor/.codex /home/agor/.codex
fi

if [ ! -L /home/agor/.gemini ]; then
  rm -rf /home/agor/.gemini
  ln -s /home/agor/.agor/.gemini /home/agor/.gemini
fi

chown -h agor:agor /home/agor/.claude /home/agor/.codex /home/agor/.gemini
echo "✅ Agent session directories configured (symlinked to persistent volume)"

# SECURITY: Ensure secure configuration for public deployments
# Always create/overwrite config.yaml to enforce security settings
echo "🔒 Ensuring secure configuration..."
cat > /home/agor/.agor/config.yaml <<YAML
daemon:
  port: ${PORT:-3030}
  allowAnonymous: false
  requireAuth: true
YAML
chown agor:agor /home/agor/.agor/config.yaml

echo "✅ Security configuration set (anonymous auth disabled)"

# Initialize database if needed (as agor user)
if [ ! -f "/home/agor/.agor/agor.db" ]; then
  echo "📦 Initializing database..."
  cd /app/apps/agor-daemon
  gosu agor node dist/index.js --init || echo "⚠️  Init skipped (daemon will auto-create)"
fi

# Start daemon as agor user
echo "✅ Starting daemon on port ${PORT:-3030}..."
cd /app/apps/agor-daemon
exec gosu agor node dist/index.js
EOF

RUN chmod +x /usr/local/bin/docker-entrypoint-prod.sh

# Expose daemon port (Railway will set PORT env var)
EXPOSE 3030

# Health check (for Docker, Railway uses railway.toml settings)
# Start period allows 60s for daemon to initialize database and start
# Note: Railway ignores this and uses its own health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3030}/health || exit 1

# Set environment
ENV NODE_ENV=production

# Start daemon
ENTRYPOINT ["/usr/local/bin/docker-entrypoint-prod.sh"]

