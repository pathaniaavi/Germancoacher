/**
 * The AIService boundary. Pure interface — implemented by the server-side Claude
 * client (`server/ai/claudeService.ts`) and by the deterministic FallbackAIService.
 * The app depends only on this interface, never on a concrete provider.
 */
import type {
  MeaningExplanation,
  Quiz,
  SentenceCheck,
  SentenceSuggestion,
  UsageExplanation,
} from "./schemas";

export type ArticleCode = "DER" | "DIE" | "DAS" | "NONE";

/** The minimal context the AI needs about a word. */
export interface WordContext {
  word: string;
  translation: string;
  article?: ArticleCode;
  plural?: string;
  partOfSpeech?: string;
  level?: string;
  notes?: string;
}

export interface AIService {
  /** One simple, one real-life, and one fill-in-the-blank sentence. */
  suggestSentences(ctx: WordContext): Promise<SentenceSuggestion>;
  /** Explain the meaning in simple English. */
  explainMeaning(ctx: WordContext): Promise<MeaningExplanation>;
  /** Explain when and how the word is used in German, with examples. */
  explainUsage(ctx: WordContext): Promise<UsageExplanation>;
  /** Grade a learner's sentence: grammar + vocab feedback + a natural alternative. */
  checkSentence(ctx: WordContext, userSentence: string): Promise<SentenceCheck>;
  /** Generate a short multiple-choice quiz from the given words. */
  generateQuiz(words: WordContext[], count: number): Promise<Quiz>;
}
