# Tinkerbrains Pipeline

Single-tenant operator console for AI-assisted product image production.

## Stack

- Next.js 15 App Router
- Tailwind CSS 4
- Supabase Auth, Postgres, Storage
- Trigger.dev background workflows
- OpenAI + fal.ai image pipeline wrappers

## Getting started

1. `cp .env.example apps/web/.env.local`
2. Fill in Supabase, Trigger.dev, OpenAI, fal.ai, and optional delivery credentials.
3. `pnpm install`
4. `pnpm dev`

## Useful commands

- `pnpm dev` - start the operator app
- `pnpm trigger:dev` - run Trigger.dev locally
- `pnpm build` - production build
- `pnpm lint` - lint the web app
- `pnpm typecheck` - TypeScript checks

## Structure

- `apps/web` - operator UI and API routes
- `trigger` - workflow orchestrator, step tasks, provider wrappers, prompt packs
- `supabase` - SQL migrations and seed data

