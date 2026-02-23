# 🦐 Shrampi — Shrimp Farm Management System

Full-stack monorepo for managing shrimp farming operations: production cycles, water quality, feeding, inventory, personnel, and finances.

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| **Frontend** | React 19, Vite, MUI 6, React Query  |
| **Backend**  | Express 4, TypeScript, Zod          |
| **Database** | PostgreSQL 16, Prisma ORM           |
| **Monorepo** | pnpm Workspaces + Turborepo         |
| **Infra**    | Docker Compose (Postgres + pgAdmin) |

## Project Structure

```
shrimp-shramp/
├── apps/
│   ├── api/          # Express REST API  (port 3001)
│   └── web/          # React + Vite SPA  (port 3000)
├── packages/
│   ├── database/     # Prisma schema, migrations & seed
│   ├── config/       # Shared configuration
│   └── types/        # Shared TypeScript types
├── docker-compose.yml
└── turbo.json
```

---

## Prerequisites

- **Node.js** ≥ 20.0.0
- **pnpm** 9.15.0 (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- **Docker** & **Docker Compose**

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd shrimp-shramp
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Default values in `.env.example` work out of the box with the Docker Compose setup:

| Variable             | Default                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| `DATABASE_URL`       | `postgresql://shrampi:shrampi_dev_2024@localhost:5432/shrampi?schema=public` |
| `JWT_SECRET`         | `change-me-in-production`                                                    |
| `JWT_REFRESH_SECRET` | `change-me-in-production`                                                    |
| `API_PORT`           | `3001`                                                                       |
| `WEB_PORT`           | `3000`                                                                       |
| `ADMIN_EMAIL`        | `admin@shrampi.com`                                                          |
| `ADMIN_PASSWORD`     | `Admin123!`                                                                  |

### 3. Start the database (Docker)

```bash
docker compose up -d
```

This starts:

- **PostgreSQL 16** on `localhost:5432`
- **pgAdmin** on [http://localhost:5050](http://localhost:5050) (email: `admin@shrampi.com` / password: `admin`)

### 4. Install dependencies

```bash
pnpm install
```

> **Tip:** If you see a pnpm version mismatch error, run with `COREPACK_ENABLE_STRICT=0 pnpm install`

### 5. Run database migrations

```bash
pnpm db:migrate
```

This applies all Prisma migrations and generates the Prisma Client.

### 6. Seed the database

```bash
pnpm db:seed
```

Populates the database with demo data including companies, farms, ponds, users, roles, production cycles, feeding records, water quality logs, and more.

### 7. Start the development servers

```bash
pnpm dev
```

This concurrently starts:

- **API** → [http://localhost:3001](http://localhost:3001)
- **Web** → [http://localhost:3000](http://localhost:3000)

Both apps hot-reload on file changes.

---

## Quick Start (TL;DR)

```bash
# 1. Setup
cp .env.example .env
docker compose up -d
pnpm install

# 2. Database
pnpm db:migrate
pnpm db:seed

# 3. Run
pnpm dev
```

---

## Production Deployment

The entire application (API + React frontend) is packaged into a **single Docker image**. In production, the Express API serves the built React app as static files.

### Option A: Docker Compose (Self-Hosted)

Deploy on any VPS (AWS Lightsail, DigitalOcean, etc.):

```bash
# Set your production credentials
export ADMIN_EMAIL="your-email@domain.com"
export ADMIN_PASSWORD="YourStrongPassword!"
export JWT_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)
export POSTGRES_PASSWORD="your-db-password"

# Build and start everything
docker compose -f docker-compose.prod.yml up --build -d
```

The app will be available at [http://localhost:3001](http://localhost:3001). The entrypoint script automatically runs database migrations and seeds on first startup.

### Option B: Railway (PaaS)

1. Push your code to GitHub
2. Create a new Railway project → "Deploy from GitHub repo"
3. Railway auto-detects the `Dockerfile` and builds it
4. Add a PostgreSQL database plugin (one click)
5. Set environment variables in Railway's dashboard:

| Variable             | Value                   |
| -------------------- | ----------------------- |
| `DATABASE_URL`       | _(auto-set by Railway)_ |
| `JWT_SECRET`         | Random secure string    |
| `JWT_REFRESH_SECRET` | Random secure string    |
| `ADMIN_EMAIL`        | Your admin email        |
| `ADMIN_PASSWORD`     | Your admin password     |
| `NODE_ENV`           | `production`            |
| `API_PORT`           | `3001`                  |

6. Generate a public domain in Networking settings

### Production Security Notes

- **Admin credentials** are read from `ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables
- **Demo credentials** hint is hidden on the login page in production
- **JWT secrets** must be strong random strings (use `openssl rand -hex 32`)
- The seed script uses `upsert`, so re-running it is safe — it updates the admin password if the env var changes

---

## Available Scripts

All scripts run from the project root via Turborepo:

| Command            | Description                            |
| ------------------ | -------------------------------------- |
| `pnpm dev`         | Start all apps in development mode     |
| `pnpm build`       | Build all apps for production          |
| `pnpm lint`        | Lint all packages                      |
| `pnpm db:generate` | Regenerate Prisma Client               |
| `pnpm db:migrate`  | Run Prisma migrations                  |
| `pnpm db:seed`     | Seed the database with demo data       |
| `pnpm db:studio`   | Open Prisma Studio (visual DB browser) |
| `pnpm clean`       | Clean all build artifacts              |

---

## Database Modules

The Prisma schema includes **9 modules** with **32+ models**:

1. **User & Access Management** — Users, roles, permissions, audit logs
2. **Farm Structure** — Farms, ponds, zones, sensors, devices
3. **Production Cycles** — Cycles, stocking, harvests, mortality tracking
4. **Feeding Management** — Feed types, inventory, feeding logs & schedules
5. **Water Quality Monitoring** — Manual logs & sensor readings
6. **Inventory Management** — Stock tracking, movements, suppliers, purchase orders
7. **Personnel Management** — Staff, shifts, attendance, tasks
8. **Financial Tracking** — Expense categories, operational & production costs, revenue

---

## pgAdmin (Database GUI)

pgAdmin is included for convenient database inspection during development.

1. Open [http://localhost:5050](http://localhost:5050)
2. Login: `admin@shrampi.com` / `admin`
3. Add a new server connection:
   - **Host:** `postgres` (Docker network name) or `host.docker.internal`
   - **Port:** `5432`
   - **Username:** `shrampi`
   - **Password:** `shrampi_dev_2024`
   - **Database:** `shrampi`

---

## Troubleshooting

| Problem                         | Solution                                                   |
| ------------------------------- | ---------------------------------------------------------- |
| pnpm version mismatch           | `COREPACK_ENABLE_STRICT=0 pnpm install`                    |
| Port already in use             | Change ports in `.env` or stop conflicting processes       |
| Database connection refused     | Ensure `docker compose up -d` is running                   |
| Prisma Client not found         | Run `pnpm db:generate`                                     |
| Seed fails with relation errors | Run `pnpm db:migrate` first to ensure schema is up to date |
| Docker build fails              | Ensure `pnpm-lock.yaml` is committed and up to date        |
