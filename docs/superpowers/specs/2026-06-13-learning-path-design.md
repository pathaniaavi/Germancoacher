# Learning Path (topic-based curriculum) — Design

Status: Approved 2026-06-13. Extends the German Vocabulary Coach with a guided, topic-based
learning path. Builds on the existing SRS engine and AIService.

## Goal
Let the learner grow vocabulary **step by step by topic**: start at A1, generate a topic's
words, drill them several ways, and progress along a recommended path. Drills feed the existing
spaced-repetition engine — the path and SRS are one system.

## Decisions
- **Word source:** AI-generated topic packs (Claude). Pick `level + topic` → ~15 words with
  article/translation/plural/POS/example, saved tagged with that topic. Built-in starter set for a
  few A1 topics so it works with no key.
- **Progression:** guided path with **soft unlocks** — topics in a recommended order, next one
  highlighted once the current is "learned"; jumping ahead allowed.
- **Drills (each over one topic's words):** multiple-choice flashcard, English→German typing,
  der/die/das article drill, adjective usage. First three this pass; adjective usage next pass.

## Data model
- Add `topic String?` to `VocabularyWord` (+ index `[userId, level, topic]`). Reuse existing `level`.
- No other schema changes. Per-topic progress is derived from words (count + recognition mastery).

## Curriculum
- A constant ordered list of A1 topics (Greetings, Numbers, Family, Food & Drink, Colors,
  Days & Time, Common Verbs, …). Drives the path UI and "what's next". Users can also generate
  arbitrary topics/levels; those appear as custom topics.
- A topic is "learned" when ≥60% of its words have cleared a recognition threshold
  (recognitionReps ≥ 1 and masteryScore ≥ a small floor). Recommended next = first unlearned
  curriculum topic.

## AI
- New `AIService.generateVocabulary(level, topic, count)` → `{ words: [...] }`, zod-validated.
  Claude via tool-use; `FallbackAIService` returns a small built-in A1 set for known topics.

## API
- `POST /api/topics/generate` `{ level, topic, count? }` → generates, dedupes vs existing words,
  persists, returns created words.
- `GET /api/learn/path` → curriculum + per-topic progress + recommended next + custom topics.
- Extend `GET /api/words` with a `topic` filter.

## Frontend
- `Learn` nav tab. `/learn` shows the path (levels → topic cards with progress rings, generate
  buttons, a Continue CTA). `/learn/topic?name=…` shows the topic's words + drill-mode tabs.
- Drill components (`components/learn/*`) pull a topic's words and post results to the existing
  `/api/review/answer` (RECOGNITION; correct→GOOD, wrong→AGAIN). Adjective usage will post to
  `/api/practice/attempt` (PRODUCTION).

## Build order
1. (this pass) `topic` field + migration; `generateVocabulary` + fallback; topic/learn services;
   routes; Learn path page + topic generation; MC flashcard, typing, and article drills wired to SRS.
2. (next) adjective-usage drill; A2+ topics; custom-topic management.
