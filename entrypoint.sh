#!/bin/sh
set -e

echo "🦐 Shrampi — Starting up..."

# Run Prisma migrations (using project's pinned version)
echo "📦 Running database migrations..."
pnpm --filter @shrampi/database exec prisma migrate deploy

# Seed the database (only inserts if not already present, uses upsert)
echo "🌱 Seeding database..."
pnpm --filter @shrampi/database db:seed

echo "🚀 Starting server..."
exec "$@"
