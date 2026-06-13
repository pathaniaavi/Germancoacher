# German Vocabulary Coach — Design & Build Spec

Status: Approved 2026-06-13. Stack: Next.js 15 (App Router) full-stack monorepo · Prisma + PostgreSQL · Auth.js · server-side Claude proxy. This pass delivers: design docs + scaffold + a fully-tested `core/srs` engine; screens land as typed stubs.

---

## 1. Product overview

A single-user-per-account tool for German learners to capture words, review them with spaced repetition, and practice *producing* them in sentences. The product's distinguishing idea: it separates **recognition** (do you know the meaning / article / plural?) from **production** (can you use the word correctly in a sentence?). Every word carries two independent competence signals, and "mastered" requires both. The whole UX is organized around moving words `recognized → usable → mastered`.

### Principles
- **Two-sided competence.** Per-word `recognitionScore` + `productionScore`; mastery needs both.
- **Fast capture, deep review.** Add-word is ~5s; review is focused and keyboard-driven.
- **Offline-tolerant, AI-enhanced.** AI improves the experience but never gates it — deterministic fallbacks everywhere.
- **Designed states.** Loading / empty / error are first-class. Dark mode is a real theme.

## 2. Feature breakdown

- **Word management** — manual add; fields: word, translation, article (der/die/das/none), plural, partOfSpeech, level (A1–C2), tags, exampleSentence, note, pronunciationHint; edit / delete / archive / search; filters (noun, verb, adjective, beginner, weak, due today, mastered).
- **Spaced repetition** — flashcard-style, one word at a time; prompts for meaning, article/plural, and usage; 4-button rating (Again/Hard/Good/Easy) → next due date; daily due queue prioritizing overdue + weak words.
- **Sentence usage practice** — per word: one simple sentence, one real-life sentence, one cloze (fill-in-the-blank); a write-your-own mode where the user submits a sentence and gets a sample correct sentence + short usage explanation.
- **Learning dashboard** — total words, due today, reviewed today, mastered, weak, streak; weekly summary.
- **Word detail** — meaning, grammar, example sentences, notes, review history, next due, difficulty.
- **Practice modes** — flashcard, typing, sentence-building, cloze, difficult-words-only.
- **AI-assisted** — suggest sentences, explain meaning, explain usage, generate natural sentences, check a user's sentence (grammar + vocab feedback + natural alternative), generate mini quizzes from saved vocab.

## 3. User flows

- **Onboarding** → email login → optional seed-pack → dashboard.
- **Add word** → form (word + translation required, rest optional) → optional "AI: suggest sentences/explain" → save → word lands in review queue as a new card.
- **Review session** → queue built (overdue → weak → due-today, capped by daily limit) → show prompt → user self-answers → flip → rate 1–4 (keyboard) → schedule next → repeat → summary.
- **Practice (write-your-own)** → pick a word/queue → user writes a sentence → AI checks → feedback + natural alternative + sample sentence → result recorded as a `PracticeAttempt`, feeding production scheduling.
- **Review history** → word detail shows every `ReviewResult` and the next due date.

## 4. Architecture & repo layout

Single Next.js repo. Server route handlers own all DB + Claude access; the API key never reaches the browser.

```
prisma/schema.prisma              data model + migrations
src/
  app/                            App Router pages + /api route handlers
    (auth)/login, onboarding
    (app)/dashboard, words, words/new, words/[id], review, practice, stats, settings
    api/{words,review,practice,ai,stats}/...
  core/                           PURE domain logic (no Next/Prisma/React imports)
    srs/  scheduler, mastery, queue, types       ← the tested core engine
    ai/   AIService interface, zod schemas, prompt builders, fallback
  server/                         db client, auth config, Claude client, services
  components/                     design-system primitives + feature components
  lib/                            shared validation, api types, formatting, keyboard
  styles/                         tokens.css (light/dark), globals
tests/                            vitest unit tests for core/srs + core/ai
```

**Hard rule:** `src/core/**` imports nothing from Next/Prisma/React (only `zod`). This makes the algorithm trivially testable and portable — a future Expo port reuses `core` unchanged.

## 5. Data model (Prisma)

Entities: `User`, `VocabularyWord`, `ExampleSentence`, `ReviewSession`, `ReviewResult`, `Tag`, `PracticeAttempt` (+ Auth.js `Account`/`Session`/`VerificationToken`).

`VocabularyWord` carries **two SRS state blocks** — recognition and production — each `{ easeFactor, intervalDays, repetitionCount, lapses, dueAt, lastReviewedAt, learningStep }`, plus derived `recognitionScore`, `productionScore`, `masteryScore` (0–100) and `status` (ACTIVE/ARCHIVED/MASTERED). See `prisma/schema.prisma` for the authoritative schema. Filters map to indexed queries over `partOfSpeech`, `level`, `masteryScore`, `recognitionDueAt`, `status` — no extra tables.

## 6. Spaced-repetition + mastery engine (core)

SuperMemo-2 variant with the 4-button Anki mapping, as pure functions in `core/srs`. Two independent schedules per word.

`schedule(state, rating, now) → newState`:

| Rating | Interval | Ease Δ | Reps |
|---|---|---|---|
| Again | learning step (10m → 1d) | −0.20 | reset 0, `lapses++` |
| Hard | `prev × 1.2` | −0.15 | +1 |
| Good | `prev × ease` | 0 | +1 |
| Easy | `prev × ease × 1.3` | +0.15 | +1 |

Ease floored at 1.3. New cards walk learning steps `[10m, 1d]` before graduating to interval-based scheduling. `dueAt = now + interval`.

**Mastery** is derived: each dimension maps `(ease, reps, intervalDays, lapses)` → 0–100; `masteryScore = 0.45·recognition + 0.55·production` (production weighted higher). A word auto-flags `MASTERED` when both dimensions clear `interval ≥ 21d` and score `≥ 80`; **weak** when `masteryScore < 40` or a recent lapse. Queue order: overdue → weak → due-today, capped by the daily limit. Production scheduling is fed by AI grading of `PracticeAttempt` (correct→Good/Easy, minor→Hard, wrong→Again), with a manual self-rate fallback when AI is off.

This module is implemented fully and unit-tested in this pass (first review, lapse reset, ease floor, easy-bonus growth, due-ordering, mastery transitions).

## 7. AI integration

`AIService` interface in `core/ai` (pure), implemented by `server/ai/claudeService.ts` calling Claude server-side. Capabilities: `suggestSentences`, `explainMeaning`, `explainUsage`, `checkSentence` (grammar + vocab feedback + natural alternative + score), `generateQuiz`. Each uses Claude **tool-use for structured JSON**, validated with zod, so the UI receives typed data. `FallbackAIService` returns deterministic, clearly-labeled stand-ins so the app degrades gracefully. Default model `claude-opus-4-8`, with a cheaper `claude-haiku-4-5-20251001` setting; key from server env only.

## 8. API surface (auth-scoped route handlers)

`GET/POST /api/words` · `GET/PATCH/DELETE /api/words/:id` · `POST /api/words/:id/archive` · `GET /api/review/queue?mode=` · `POST /api/review/answer` · `POST /api/practice/attempt` · `GET /api/practice/:wordId` · `POST /api/ai/{suggest,explain,check,quiz}` · `GET /api/stats/summary` · `GET /api/stats/weekly`. REST; request/response validated with shared zod schemas (`src/lib/validation.ts`).

## 9. Frontend structure

Compact, label-first design system on CSS variables (light↔dark = token swap): `Button, Input, Select, Textarea, Card, Badge, Dialog, Toast, ProgressRing, EmptyState, Skeleton, ThemeToggle`. Screens: Login/Onboarding, Dashboard, Add Word, All Words (search + filter chips), Word Detail, Review Session (Space=flip, 1–4=rate), Practice, Stats, Settings. Mobile-first, semantic, keyboard-accessible.

## 10. MVP vs phases

- **MVP (this build):** auth wiring, word CRUD + filters/search, recognition review (flashcard + typing) on the SR engine, dashboard, stats summary, dark mode, AI suggest + check behind the interface. Screens stubbed where noted; engine + data model + AI boundary fully real and tested.
- **Phase 2 (delivered):** production scheduling via AI grading (`core/srs/grading.ts` → `practiceService`); cloze + quiz practice modes; weekly activity chart; optimistic auth middleware. Remaining: sentence-building (drag-to-order) mode; richer charting (recharts).
- **Phase 3:** streaks/gamification; bulk import; audio/pronunciation; multi-device sync hardening; Expo port reusing `core`.

## 11. Delivered
(a) this spec; (b) Next.js scaffold (configs, tokens/theme, design-system primitives, routing, Prisma schema, Auth.js + DB wiring, AIService interface + Claude impl + fallback); (c) the fully-implemented, unit-tested `core/srs` engine + mastery model + grade→rating mapping; (d) functional screens (dashboard, add-word, words list/detail, recognition review with keyboard, practice with write-your-own/cloze/quiz modes, stats, settings); (e) production scheduling wired through AI grading; (f) optimistic auth middleware. Verified: 48 unit tests pass, `tsc --noEmit` clean, `next build` succeeds (23 routes + middleware).
