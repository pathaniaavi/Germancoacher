/** Zod schemas for API request payloads. Enum unions mirror the Prisma schema. */
import { z } from "zod";

export const ARTICLES = ["DER", "DIE", "DAS", "NONE"] as const;
export const PARTS_OF_SPEECH = [
  "NOUN",
  "VERB",
  "ADJECTIVE",
  "ADVERB",
  "PRONOUN",
  "PREPOSITION",
  "CONJUNCTION",
  "ARTICLE",
  "NUMERAL",
  "INTERJECTION",
  "PHRASE",
  "OTHER",
] as const;
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const RATINGS = ["AGAIN", "HARD", "GOOD", "EASY"] as const;
export const DIMENSIONS = ["RECOGNITION", "PRODUCTION"] as const;
export const REVIEW_MODES = ["FLASHCARD", "TYPING", "SENTENCE", "CLOZE", "DIFFICULT"] as const;
export const PRACTICE_MODES = ["FLASHCARD", "TYPING", "SENTENCE_BUILD", "CLOZE", "WRITE_OWN"] as const;

export const createWordSchema = z.object({
  word: z.string().trim().min(1, "Word is required").max(120),
  translation: z.string().trim().min(1, "Translation is required").max(200),
  article: z.enum(ARTICLES).default("NONE"),
  plural: z.string().trim().max(120).optional(),
  partOfSpeech: z.enum(PARTS_OF_SPEECH).default("OTHER"),
  level: z.enum(LEVELS).default("A1"),
  notes: z.string().trim().max(2000).optional(),
  exampleSentence: z.string().trim().max(500).optional(),
  pronunciationHint: z.string().trim().max(200).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});
export type CreateWordInput = z.infer<typeof createWordSchema>;

export const updateWordSchema = createWordSchema.partial();
export type UpdateWordInput = z.infer<typeof updateWordSchema>;

// Quick add: just the German word. Translation is optional (used as the offline fallback
// when AI can't resolve a meaning).
export const quickAddSchema = z.object({
  word: z.string().trim().min(1, "Type a word").max(120),
  translation: z.string().trim().max(200).optional(),
  topic: z.string().trim().max(60).optional(),
});
export type QuickAddInput = z.infer<typeof quickAddSchema>;

export const wordLookupRequestSchema = z.object({
  word: z.string().trim().min(1, "Type a word").max(120),
  translation: z.string().trim().max(200).optional(),
});
export type WordLookupRequestInput = z.infer<typeof wordLookupRequestSchema>;

export const listWordsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  partOfSpeech: z.enum(PARTS_OF_SPEECH).optional(),
  level: z.enum(LEVELS).optional(),
  filter: z.enum(["all", "due", "weak", "mastered", "archived"]).default("all"),
  tag: z.string().trim().max(40).optional(),
  topic: z.string().trim().max(60).optional(),
});

export const generateTopicSchema = z.object({
  level: z.enum(LEVELS).default("A1"),
  topic: z.string().trim().min(1).max(60),
  count: z.number().int().min(3).max(25).default(12),
});
export type GenerateTopicInput = z.infer<typeof generateTopicSchema>;
export type ListWordsQuery = z.infer<typeof listWordsQuerySchema>;

export const reviewAnswerSchema = z.object({
  wordId: z.string().min(1),
  dimension: z.enum(DIMENSIONS).default("RECOGNITION"),
  rating: z.enum(RATINGS),
  mode: z.enum(REVIEW_MODES).default("FLASHCARD"),
  sessionId: z.string().optional(),
});
export type ReviewAnswerInput = z.infer<typeof reviewAnswerSchema>;

export const practiceAttemptSchema = z.object({
  wordId: z.string().min(1),
  mode: z.enum(PRACTICE_MODES).default("WRITE_OWN"),
  userSentence: z.string().trim().min(1).max(500),
});
export type PracticeAttemptInput = z.infer<typeof practiceAttemptSchema>;

export const AI_MODELS = [
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
] as const;

export const settingsUpdateSchema = z.object({
  dailyReviewLimit: z.number().int().min(5).max(200).optional(),
  newCardsPerDay: z.number().int().min(0).max(100).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  aiEnabled: z.boolean().optional(),
  aiModel: z.enum(AI_MODELS).optional(),
  // "" clears the saved key; omitting it leaves the existing key untouched.
  anthropicApiKey: z.string().max(200).optional(),
});
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

export const aiWordRefSchema = z.object({ wordId: z.string().min(1) });
export const aiCheckSchema = z.object({
  wordId: z.string().min(1),
  userSentence: z.string().trim().min(1).max(500),
});
export const aiQuizSchema = z.object({
  count: z.number().int().min(1).max(20).default(5),
  filter: z.enum(["all", "due", "weak"]).default("weak"),
});
