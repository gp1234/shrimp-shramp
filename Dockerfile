# ── Stage 1: Build ──
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/config/package.json packages/config/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ packages/
COPY apps/ apps/

# Generate Prisma client
RUN pnpm --filter @shrampi/database db:generate

# Build the React frontend
RUN pnpm --filter @shrampi/web build

# ── Stage 2: Production ──
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/config/package.json packages/config/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# Install all dependencies (tsx needed for runtime)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generate client
COPY packages/database/prisma packages/database/prisma
RUN pnpm --filter @shrampi/database db:generate

# Copy source code (API runs via tsx, no tsc build needed)
COPY --from=builder /app/apps/web/dist apps/web/dist
COPY packages/config packages/config
COPY packages/types packages/types
COPY packages/database/src packages/database/src
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json

# Copy entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npx", "tsx", "apps/api/src/server.ts"]
