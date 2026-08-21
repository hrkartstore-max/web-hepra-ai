# HEPRA AI Website Builder

Real, working MVP: describe a website → AI (Claude, via the Anthropic API) generates actual
Shopify / WordPress / PHP project files → edit them → version them → download a real, extractable ZIP.

## What's implemented (real, not mocked)

- Auth: email/password via NextAuth credentials provider, bcrypt-hashed passwords, JWT sessions.
- Project CRUD, scoped to the logged-in user (every query checks `project.userId === session.user.id`).
- Generation pipeline: `app/api/projects/[id]/generate/route.ts` calls the real Anthropic API
  server-side (`lib/services/ai-generator.ts`), validates the JSON it returns
  (`lib/services/validator.ts` blocks path traversal, oversized files, too many files),
  and persists the result as a new `Version` + `ProjectFile` rows in Postgres.
- File explorer + editor: reads/writes real rows via `PATCH /api/projects/[id]/files`.
- Version history: every generation creates a new version; restoring just re-points
  `activeVersionId` — it never deletes other versions.
- ZIP export: `lib/services/zip-builder.ts` uses JSZip to build a real, extractable archive
  from the DB-stored files. Streamed back with `Content-Type: application/zip`.
- Preview: renders the entry file. For `index.html` output it's a real sandboxed iframe.
  For PHP/Liquid output it shows the generated source with an honest note that full
  server-side rendering needs a PHP/Shopify/WordPress host — that's what the ZIP is for.
  This build intentionally does not fake executing PHP or Liquid in the browser.

## What's intentionally out of scope for this MVP

These were in the original spec but are follow-ups, not silently faked:

- Google OAuth (env vars are read but no provider wired up yet)
- Object storage (S3/R2) — files currently live as rows in Postgres (`STORAGE_MODE=database`).
  Fine for text-based generated files; add a storage provider before handling large binary assets.
- Background job queue / Redis — generation runs inline in the API request (`JOB_MODE=inline`).
  Works fine for typical generations; for very large sites you'd want a queue + worker.
- Duplicate-project, generation-cancel/retry endpoints from the original route list.

## Setup

1. **Neon Postgres**: create a project at neon.tech, copy the pooled connection string into `DATABASE_URL`.
2. **Anthropic API key**: get one from console.anthropic.com, put it in `AI_PROVIDER_API_KEY`.
   This key is only ever read server-side (`lib/services/ai-generator.ts`) — never sent to the browser.
3. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `AUTH_SECRET`
   (generate with `openssl rand -base64 32`), and `AI_PROVIDER_API_KEY`.
4. Install and migrate:
   ```bash
   npm install
   npx prisma migrate dev --name init
   npm run dev
   ```
5. Open http://localhost:3000, register an account, create a project, generate.

## Deploy: GitHub → Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. In Vercel → Project → Settings → Environment Variables, add everything from `.env.example`
   (same values as your `.env.local`, plus set `NEXTAUTH_URL` to your production URL).
4. Before the first deploy (or via a Vercel build step), run the migration against Neon:
   ```bash
   npx prisma migrate deploy
   ```
   You can run this locally pointed at the Neon `DATABASE_URL`, or add it as part of your build command.
5. Deploy. `npm run build` runs `prisma generate` automatically (see `postinstall`/`build` scripts).

## Verifying it actually works

```bash
npm install
npx prisma generate
npx tsc --noEmit
npm run build
```

Then manually: register → create a project → generate → confirm real files appear → edit and
save a file → generate again to create version 2 → restore version 1 → download the ZIP →
extract it and confirm the files match what's in the file explorer.

## Production readiness notes

- The current MVP stores generated text and reference images in PostgreSQL. This is simple and reliable for small projects, but move image/object storage to S3/R2 before allowing large media libraries.
- Generation is synchronous. For high traffic or very large generations, move the AI job to a queue/worker and return a job ID to the browser.
- The browser preview intentionally executes only static `index.html` inside a sandboxed iframe. Shopify Liquid, WordPress PHP, and standalone PHP are exported as source because they require their target runtime.
- Keep `AI_PROVIDER_API_KEY`, `AUTH_SECRET`, and `DATABASE_URL` server-side only.
- Before production deployment, run `npx prisma migrate deploy` against the production database and verify the selected Anthropic model is available to the configured API account.
- Add rate limiting and usage/billing controls before exposing AI generation publicly; otherwise a single account can consume significant API spend.
- Add automated tests for auth ownership, path validation, ZIP export, version restoration, and generation failure recovery before treating the app as production-complete.
