/**
 * Deterministic AIService used when no Anthropic key is configured (or AI is disabled).
 * It never calls the network — it produces sensible, clearly-templated output so every
 * AI-touching screen keeps working. Output is intentionally simple, not creative.
 */
import {
  type GeneratedVocabulary,
  type GeneratedWord,
  type Quiz,
  type SentenceCheck,
  type SentenceSuggestion,
  type MeaningExplanation,
  type UsageExplanation,
  type WordLookup,
} from "./schemas";
import type { AIService, WordContext } from "./types";

/** Tiny built-in A1 packs so the learning path works with no Anthropic key. */
const BUILTIN_A1: Record<string, GeneratedWord[]> = {
  food: [
    { word: "Brot", translation: "bread", article: "DAS", plural: "Brote", partOfSpeech: "NOUN", example: "Das Brot ist frisch." },
    { word: "Apfel", translation: "apple", article: "DER", plural: "Äpfel", partOfSpeech: "NOUN", example: "Der Apfel ist rot." },
    { word: "Wasser", translation: "water", article: "DAS", partOfSpeech: "NOUN", example: "Ich trinke Wasser." },
    { word: "Kaffee", translation: "coffee", article: "DER", partOfSpeech: "NOUN", example: "Der Kaffee ist heiß." },
    { word: "Milch", translation: "milk", article: "DIE", partOfSpeech: "NOUN", example: "Die Milch ist kalt." },
    { word: "Käse", translation: "cheese", article: "DER", partOfSpeech: "NOUN", example: "Der Käse schmeckt gut." },
    { word: "Ei", translation: "egg", article: "DAS", plural: "Eier", partOfSpeech: "NOUN", example: "Das Ei ist gekocht." },
    { word: "Saft", translation: "juice", article: "DER", plural: "Säfte", partOfSpeech: "NOUN", example: "Der Saft ist süß." },
  ],
  family: [
    { word: "Mutter", translation: "mother", article: "DIE", plural: "Mütter", partOfSpeech: "NOUN", example: "Meine Mutter kocht." },
    { word: "Vater", translation: "father", article: "DER", plural: "Väter", partOfSpeech: "NOUN", example: "Mein Vater arbeitet." },
    { word: "Schwester", translation: "sister", article: "DIE", plural: "Schwestern", partOfSpeech: "NOUN", example: "Meine Schwester liest." },
    { word: "Bruder", translation: "brother", article: "DER", plural: "Brüder", partOfSpeech: "NOUN", example: "Mein Bruder spielt." },
    { word: "Kind", translation: "child", article: "DAS", plural: "Kinder", partOfSpeech: "NOUN", example: "Das Kind schläft." },
    { word: "Familie", translation: "family", article: "DIE", plural: "Familien", partOfSpeech: "NOUN", example: "Die Familie ist groß." },
  ],
  numbers: [
    { word: "eins", translation: "one", article: "NONE", partOfSpeech: "NUMERAL", example: "Ich habe eins." },
    { word: "zwei", translation: "two", article: "NONE", partOfSpeech: "NUMERAL", example: "Zwei Äpfel, bitte." },
    { word: "drei", translation: "three", article: "NONE", partOfSpeech: "NUMERAL", example: "Drei Kinder spielen." },
    { word: "vier", translation: "four", article: "NONE", partOfSpeech: "NUMERAL", example: "Vier Stühle stehen hier." },
    { word: "fünf", translation: "five", article: "NONE", partOfSpeech: "NUMERAL", example: "Fünf Minuten noch." },
    { word: "sechs", translation: "six", article: "NONE", partOfSpeech: "NUMERAL", example: "Es ist sechs Uhr." },
  ],
};

const GENERIC_A1: GeneratedWord[] = [
  { word: "Hallo", translation: "hello", article: "NONE", partOfSpeech: "INTERJECTION", example: "Hallo, wie geht's?" },
  { word: "danke", translation: "thank you", article: "NONE", partOfSpeech: "INTERJECTION", example: "Danke schön!" },
  { word: "bitte", translation: "please / you're welcome", article: "NONE", partOfSpeech: "INTERJECTION", example: "Bitte sehr." },
];

/** Built-in words for a topic, or null if none ship for it. */
export function builtinVocabularyFor(topic: string): GeneratedWord[] | null {
  const key = topic.toLowerCase();
  const match = Object.keys(BUILTIN_A1).find((k) => key.includes(k));
  return match ? BUILTIN_A1[match]! : null;
}

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

  async generateVocabulary(level: string, topic: string, count: number): Promise<GeneratedVocabulary> {
    const builtin = builtinVocabularyFor(topic) ?? GENERIC_A1;
    return { words: builtin.slice(0, Math.max(1, count)) };
  }

  async lookupWord(word: string): Promise<WordLookup> {
    // Offline: resolve from built-in packs if we happen to know the word; otherwise leave
    // the translation empty so the UI asks the learner for the meaning.
    const key = word.trim().toLowerCase();
    const hit = Object.values(BUILTIN_A1)
      .flat()
      .find((w) => w.word.toLowerCase() === key);
    if (hit) {
      return {
        translation: hit.translation,
        article: hit.article,
        plural: hit.plural,
        partOfSpeech: hit.partOfSpeech,
        example: hit.example,
        level: "A1",
      };
    }
    return { translation: "" };
  }
}
