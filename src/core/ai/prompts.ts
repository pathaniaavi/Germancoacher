/**
 * Prompt builders for the Claude-backed AIService. Kept here (in pure `core`) so the
 * wording is testable and provider-agnostic; the server wires these into tool-use calls.
 */
import type { WordContext } from "./types";

const articleText: Record<string, string> = {
  DER: "der",
  DIE: "die",
  DAS: "das",
  NONE: "",
};

export function describeWord(ctx: WordContext): string {
  const parts = [`German word: "${ctx.word}"`, `English: "${ctx.translation}"`];
  if (ctx.article && ctx.article !== "NONE") parts.push(`article: ${articleText[ctx.article]}`);
  if (ctx.plural) parts.push(`plural: ${ctx.plural}`);
  if (ctx.partOfSpeech) parts.push(`part of speech: ${ctx.partOfSpeech}`);
  if (ctx.level) parts.push(`CEFR level: ${ctx.level}`);
  return parts.join(", ") + ".";
}

export const TUTOR_SYSTEM =
  "You are a precise, encouraging German tutor for English speakers. " +
  "Always produce grammatically correct German with correct articles, cases, and word order. " +
  "Keep explanations short and beginner-friendly. Respond only via the provided tool.";

export interface Prompt {
  system: string;
  user: string;
}

export function suggestSentencesPrompt(ctx: WordContext): Prompt {
  return {
    system: TUTOR_SYSTEM,
    user:
      `${describeWord(ctx)}\n\n` +
      "Produce three example sentences using this word: (1) a SIMPLE beginner sentence, " +
      "(2) a PRACTICAL real-life sentence, and (3) a CLOZE sentence where the target word " +
      'is replaced by "____". Provide English translations for the simple and real-life ones.',
  };
}

export function explainMeaningPrompt(ctx: WordContext): Prompt {
  return {
    system: TUTOR_SYSTEM,
    user: `${describeWord(ctx)}\n\nExplain the meaning in one or two short, simple English sentences.`,
  };
}

export function explainUsagePrompt(ctx: WordContext): Prompt {
  return {
    system: TUTOR_SYSTEM,
    user:
      `${describeWord(ctx)}\n\n` +
      "Explain when and how this word is used in German (register, common collocations, " +
      "any case/preposition it pairs with). Give 1-3 short German example phrases.",
  };
}

export function checkSentencePrompt(ctx: WordContext, userSentence: string): Prompt {
  return {
    system: TUTOR_SYSTEM,
    user:
      `${describeWord(ctx)}\n\n` +
      `The learner wrote this sentence trying to use the word:\n"${userSentence}"\n\n` +
      "Judge whether it is correct and natural. Give specific grammar feedback and vocabulary " +
      "feedback, a more natural alternative sentence in German, and a 0-100 score. Be kind but honest.",
  };
}

export function generateQuizPrompt(words: WordContext[], count: number): Prompt {
  const list = words.map((w) => `- ${w.word} = ${w.translation}`).join("\n");
  return {
    system: TUTOR_SYSTEM,
    user:
      `Create a ${count}-question multiple-choice quiz from these German words:\n${list}\n\n` +
      "Mix question types (meaning, article, usage). Each question has 3-4 options, exactly one " +
      "correct, plus a one-line explanation. Index the correct option from 0.",
  };
}
