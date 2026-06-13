# Germancoacher — German Vocabulary Coach

A focused learning tool for German vocabulary: capture words you've learned, review them with
spaced repetition, and practice **using** them in real sentences. The product separates two kinds
of knowing — **recognition** (meaning / article / plural) and **production** (using the word
correctly) — and only treats a word as *mastered* when both are strong.

> Status: MVP scaffold. The spaced-repetition + mastery engine (`src/core/srs`) is fully implemented
> and unit-tested. Screens are typed stubs wired to the API contract. See
> [`docs/superpowers/specs/2026-06-13-german-vocab-coach-design.md`](docs/superpowers/specs/2026-06-13-german-vocab-coach-design.md)
> for the full design.

## Stack

- **Next.js 15** (App Router) — UI + API route handlers in one repo
- **Prisma + PostgreSQL** — data model & migrations
- **Auth.js (next-auth v5)** — email magic-link auth
- **Anthropic Claude** — server-side proxy for AI features (sentence suggestions, grammar checking, quizzes)
- **Vitest** — unit tests for the pure domain engine
- **TypeScript** throughout; **CSS variables** for a token-based design system with first-class dark mode

## Architecture rule

`src/core/**` is pure domain logic — it imports nothing from Next, Prisma, or React (only `zod`).
That keeps the review algorithm trivially testable and portable (a future Expo port reuses `core` unchanged).

```
src/core/srs   → scheduler, mastery, queue, types   (the tested engine)
src/core/ai    → AIService interface, zod schemas, prompts, deterministic fallback
src/server     → db client, auth, Claude client, services (DB + AI live here only)
src/app        → pages + /api route handlers
src/components  → design-system primitives + feature components
```

## Getting started

Run these one per line (don't paste trailing `#` comments into zsh — it doesn't treat them as comments and will choke).

```bash
npm install
```

Start a local Postgres (Docker is the zero-install option):

```bash
docker run -d --name gvc-postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=german_vocab_coach \
  -p 5432:5432 postgres:16
```

Create your env file, then set a real `AUTH_SECRET`:

```bash
cp .env.example .env
```

Set `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/german_vocab_coach?schema=public"`
and `AUTH_SECRET` (generate one with `openssl rand -base64 32`). `ANTHROPIC_API_KEY` and
`EMAIL_SERVER` are optional.

Create the schema and seed a demo deck:

```bash
npm run prisma:migrate
npm run db:seed
npm run dev
```

### Signing in locally (no email server needed)

In development, if `EMAIL_SERVER` is unset, the magic-link is **printed to the `npm run dev`
console** instead of emailed. To use the seeded data:

1. Open <http://localhost:3000>, enter `demo@example.com`, submit.
2. Copy the `🔑 [dev] Sign-in link …` URL from the terminal running `npm run dev`.
3. Open it in the browser — you're signed in as the demo user with 8 starter words.

### Notes

- Core-engine tests need no DB or network: `npm test`.
- AI features degrade gracefully: with no `ANTHROPIC_API_KEY`, a deterministic `FallbackAIService` is used.
- Stop/clean up: `docker rm -f gvc-postgres` removes the database container.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next dev server |
| `npm test` | Vitest unit tests (core engine) |
| `npm run typecheck` | `tsc --noEmit` across the repo |
| `npm run prisma:migrate` | Apply schema to Postgres |
| `npm run db:seed` | Seed a demo user + starter words |

## Roadmap

- **Phase 2** — production scheduling via AI grading, cloze + sentence-building modes, weekly chart, quiz generation
- **Phase 3** — streaks, bulk import, audio/pronunciation, multi-device sync, Expo port reusing `core`
