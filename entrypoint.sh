#!/bin/sh
set -e

echo "🦐 Shrampi — Starting up..."

# Run Prisma migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

# Seed the database (only inserts if not already present, uses upsert)
echo "🌱 Seeding database..."
npx tsx packages/database/prisma/seed.ts

echo "🚀 Starting server..."
exec "$@"
