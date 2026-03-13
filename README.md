# Intelligent Project Resource Planning MVP

## Architecture Overview
- **Monorepo** with `apps/backend` (NestJS + Prisma + PostgreSQL) and `apps/frontend` (Next.js + Tailwind + shadcn-style UI primitives).
- **Scheduling engine** in backend enforces one-task-per-employee, working-day logic, holidays, absences, dependencies, and MAXIMUM-priority cascade postponement.
- **Frontend** renders employee resource timeline/Gantt with task and employee modals, filters, project legend, collision workflows.

## Folder Structure
- `apps/backend`: NestJS API, Prisma schema/migrations/seed, scheduling services, backend tests.
- `apps/frontend`: Next.js app, timeline UI, TanStack Query integration, frontend + Playwright tests.
- `.env.example`, `docker-compose.yml`: dockerized local stack.

## Quick Start with Docker
```bash
cp .env.example .env
docker compose up --build
```
Open:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## Docker Commands
```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
docker compose exec backend npm run test
docker compose exec frontend npm run test
```

## Environment Variables
- `DATABASE_URL`: Prisma/Postgres connection string.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: DB bootstrap.
- `BACKEND_PORT`: Backend exposed port.
- `NEXT_PUBLIC_API_URL`: Frontend API base URL.

## Migrations & Seed
- Container startup runs `prisma migrate deploy` automatically.
- Seed data command: `npm run seed` in backend.

## Tests
- Backend unit tests: scheduling engine behaviors.
- Frontend unit tests: timeline filtering, search, modals, highlights.
- E2E tests: create/validate collisions and MAXIMUM cascade flow.

## Scheduling Rules Summary
- One employee can only hold one simultaneous work package.
- Duration is working days (Mon-Fri), skipping weekends, location holidays (Germany incl. BW fallback logic), and employee absences.
- Collisions blocked by default with structured errors and actionable options.
- MAXIMUM priority inserts earliest feasible slot and cascades postponement of lower-priority tasks.

## Assumptions and Extension Points
- Company holidays can be added via custom calendar provider in scheduling service.
- Task dependencies currently support FS and SS with deterministic forward scheduling.
- Rebuild endpoint can be expanded to include project-level optimization heuristics.
