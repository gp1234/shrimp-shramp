# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shrampi is a full-stack shrimp farm management SaaS application. It's a pnpm monorepo using Turborepo with three layers: a React+Vite frontend (`apps/web`), an Express REST API (`apps/api`), and shared packages (`packages/database`, `packages/types`, `packages/config`).

## Commands

```bash
# Development
pnpm dev              # Start all apps (web :3000, api :3001)
pnpm build            # Build all packages
pnpm lint             # Lint all packages

# Database (PostgreSQL via Docker)
docker compose up -d          # Start PostgreSQL + pgAdmin
pnpm db:generate              # Generate Prisma client
pnpm db:migrate               # Run migrations (prisma migrate dev)
pnpm db:seed                  # Seed demo data
pnpm db:studio                # Open Prisma Studio GUI

# Target a specific workspace
pnpm --filter @shrampi/api <script>
pnpm --filter @shrampi/web <script>
pnpm --filter @shrampi/database <script>
```

No test framework is configured yet.

## Architecture

### Monorepo Layout

- **apps/api/** — Express 4 REST API on port 3001. Routes under `src/routes/`, middleware in `src/middleware/`. All routes prefixed `/api/v1/`.
- **apps/web/** — React 19 SPA with Vite, MUI 6, React Router 7, React Query, React Hook Form. Pages in `src/pages/`, contexts (Auth, Farm, Theme) in `src/contexts/`.
- **packages/database/** — Prisma schema (`prisma/schema.prisma`) with 32+ models across 8 domains, migrations, and seed script. UUID primary keys, PostgreSQL enums, snake_case DB mapping.
- **packages/types/** — Shared TypeScript types for API responses, auth, and KPIs.
- **packages/config/** — Centralized environment/config resolution. Dotenv loaded only in dev; production reads real env vars.

### Key Patterns

- **Auth**: JWT Bearer tokens + refresh tokens. `authenticate()` and `authorize(...roles)` middleware in the API. AuthContext on the frontend with Axios interceptors for token injection and 401 auto-refresh.
- **Multi-tenancy**: Company -> Farms -> Ponds hierarchy. FarmContext tracks the user's currently selected farm.
- **RBAC**: 5 roles (Admin, Farm Manager, Supervisor, Operator, Viewer) with a resource x action permission matrix (UserRole -> RolePermission).
- **State management**: React Context for auth/farm/theme state; React Query for server data (30s staleTime).
- **i18n**: i18next with browser language detection. Translations in `apps/web/src/locales/`.
- **API versioning**: All endpoints under `/api/v1/`. Health check at `GET /api/v1/health`.

### Database Domains

Users & RBAC | Farm structure (farms, ponds, sensors) | Production cycles (stocking, harvest, mortality) | Feeding management | Water quality monitoring | Inventory & suppliers | Personnel & tasks | Financial tracking

### Deployment

Multi-stage Dockerfile. In production, Express serves the built React app as static files on a single port. `entrypoint.sh` auto-runs Prisma migrations and seeds on startup. Deployed on Railway with auto-build from GitHub pushes.

## Environment

Copy `.env.example` to `.env` for local dev. Key vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `API_PORT`, `WEB_PORT`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Production uses Railway-provided env vars (notably `PORT`).
