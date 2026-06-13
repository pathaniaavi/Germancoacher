/**
 * Deterministic AIService used when no Anthropic key is configured (or AI is disabled).
 * It never calls the network — it produces sensible, clearly-templated output so every
 * AI-touching screen keeps working. Output is intentionally simple, not creative.
 */
import {
  type Quiz,
  type SentenceCheck,
  type SentenceSuggestion,
  type MeaningExplanation,
  type UsageExplanation,
} from "./schemas";
import type { AIService, WordContext } from "./types";

const ARTICLE: Record<string, string> = { DER: "Der", DIE: "Die", DAS: "Das", NONE: "" };

function articlePrefix(ctx: WordContext): string {
  const a = ctx.article ? ARTICLE[ctx.article] : "";
  return a ? `${a} ${ctx.word}` : ctx.word;
}

/**
 * Whole-word (token) match so "Hause" does not count as using "Haus".
 * Splits on non-letters (Unicode-aware, so umlauts/ß are preserved). This is a
 * deterministic heuristic — morphology (Hauses, Häuser) is the real grader's job.
 */
function usesWord(sentence: string, word: string): boolean {
  const tokens = sentence.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  return tokens.includes(word.toLowerCase());
}

export class FallbackAIService implements AIService {
  async suggestSentences(ctx: WordContext): Promise<SentenceSuggestion> {
    const subject = articlePrefix(ctx);
    const simpleDe = `${subject} ist hier.`;
    const realDe = `Im Alltag brauche ich ${ctx.word} oft.`;
    return {
      simple: {
        de: simpleDe,
        en: `The ${ctx.translation} is here.`,
      },
      realLife: {
        de: realDe,
        en: `In everyday life I often need "${ctx.translation}".`,
      },
      cloze: {
        de: simpleDe.replace(ctx.word, "____"),
        answer: ctx.word,
        en: `The ${ctx.translation} is here.`,
      },
    };
  }

  async explainMeaning(ctx: WordContext): Promise<MeaningExplanation> {
    return {
      simpleEnglish: `"${ctx.word}" means "${ctx.translation}".`,
    };
  }

  async explainUsage(ctx: WordContext): Promise<UsageExplanation> {
    return {
      usage: `Use "${ctx.word}" when you mean "${ctx.translation}".`,
      examples: [`${articlePrefix(ctx)} ist wichtig.`],
    };
  }

  async checkSentence(ctx: WordContext, userSentence: string): Promise<SentenceCheck> {
    const trimmed = userSentence.trim();
    const hasWord = usesWord(trimmed, ctx.word);
    const wellFormed = /[.!?]\s*$/.test(trimmed) && trimmed.length >= 5;
    const isCorrect = hasWord && wellFormed;
    const score = hasWord ? (wellFormed ? 70 : 55) : 30;
    return {
      isCorrect,
      score,
      grammarFeedback: wellFormed
        ? "Sentence structure looks complete."
        : "Make sure the sentence is complete and ends with punctuation.",
      vocabFeedback: hasWord
        ? `Good — you used "${ctx.word}".`
        : `Try to actually include "${ctx.word}" in your sentence.`,
      naturalAlternative: `${articlePrefix(ctx)} ist hier.`,
    };
  }

  async generateQuiz(words: WordContext[], count: number): Promise<Quiz> {
    const pool = words.filter((w) => w.word && w.translation);
    const n = Math.max(1, Math.min(count, pool.length || 1));
    const questions = Array.from({ length: n }, (_, i) => {
      const target = pool[i % pool.length] ?? { word: "Wort", translation: "word" };
      const distractors = pool
        .filter((w) => w.translation !== target.translation)
        .slice(0, 3)
        .map((w) => w.translation);
      const options = [target.translation, ...distractors];
      // Rotate so the answer isn't always first (deterministic, no RNG).
      const shift = i % options.length;
      const rotated = options.slice(shift).concat(options.slice(0, shift));
      const answerIndex = rotated.indexOf(target.translation);
      return {
        prompt: `What does "${target.word}" mean?`,
        options: rotated,
        answerIndex,
        explanation: `"${target.word}" means "${target.translation}".`,
      };
    });
    return { questions };
  }
}
