/**
 * Zod schemas for AI outputs. These are the single source of truth for the shape
 * of structured data returned by the AIService — the server validates Claude's
 * tool output against them, so the UI always receives typed, trusted data.
 */
import { z } from "zod";

export const sentencePairSchema = z.object({
  de: z.string().min(1),
  en: z.string().min(1),
});

export const clozeSentenceSchema = z.object({
  /** German sentence with the target word replaced by "____". */
  de: z.string().min(1),
  /** The word that fills the blank. */
  answer: z.string().min(1),
  en: z.string().optional(),
});

export const sentenceSuggestionSchema = z.object({
  simple: sentencePairSchema,
  realLife: sentencePairSchema,
  cloze: clozeSentenceSchema,
});

export const meaningExplanationSchema = z.object({
  simpleEnglish: z.string().min(1),
});

export const usageExplanationSchema = z.object({
  usage: z.string().min(1),
  examples: z.array(z.string().min(1)).min(1),
});

export const sentenceCheckSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number().int().min(0).max(100),
  grammarFeedback: z.string().min(1),
  vocabFeedback: z.string().min(1),
  naturalAlternative: z.string().min(1),
});

export const quizQuestionSchema = z.object({
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answerIndex: z.number().int().min(0),
  explanation: z.string().min(1),
});

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1),
});

export const generatedWordSchema = z.object({
  word: z.string().min(1),
  translation: z.string().min(1),
  // Kept loose; the server normalizes to the DER/DIE/DAS/NONE + POS enums.
  article: z.string().optional(),
  plural: z.string().optional(),
  partOfSpeech: z.string().optional(),
  example: z.string().optional(),
});

export const generatedVocabularySchema = z.object({
  words: z.array(generatedWordSchema).min(1),
});

// Enrichment for a single word the user typed. `translation` may be empty when the
// word can't be resolved (offline / not a real word) — the UI then asks for the meaning.
export const wordLookupSchema = z.object({
  translation: z.string(),
  article: z.string().optional(),
  plural: z.string().optional(),
  partOfSpeech: z.string().optional(),
  level: z.string().optional(),
  example: z.string().optional(),
  pronunciationHint: z.string().optional(),
});

export type GeneratedWord = z.infer<typeof generatedWordSchema>;
export type GeneratedVocabulary = z.infer<typeof generatedVocabularySchema>;
export type WordLookup = z.infer<typeof wordLookupSchema>;

export type SentencePair = z.infer<typeof sentencePairSchema>;
export type ClozeSentence = z.infer<typeof clozeSentenceSchema>;
export type SentenceSuggestion = z.infer<typeof sentenceSuggestionSchema>;
export type MeaningExplanation = z.infer<typeof meaningExplanationSchema>;
export type UsageExplanation = z.infer<typeof usageExplanationSchema>;
export type SentenceCheck = z.infer<typeof sentenceCheckSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
