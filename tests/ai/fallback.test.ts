import { describe, it, expect } from "vitest";
import { FallbackAIService } from "@/core/ai/fallback";
import {
  sentenceSuggestionSchema,
  sentenceCheckSchema,
  quizSchema,
} from "@/core/ai/schemas";
import type { WordContext } from "@/core/ai/types";

const ai = new FallbackAIService();
const haus: WordContext = { word: "Haus", translation: "house", article: "DAS", partOfSpeech: "NOUN" };

describe("FallbackAIService.suggestSentences", () => {
  it("returns schema-valid suggestions with a working cloze", async () => {
    const out = await ai.suggestSentences(haus);
    expect(() => sentenceSuggestionSchema.parse(out)).not.toThrow();
    expect(out.cloze.answer).toBe("Haus");
    expect(out.cloze.de).toContain("____");
    expect(out.cloze.de).not.toContain("Haus");
  });
});

describe("FallbackAIService.checkSentence", () => {
  it("accepts a complete sentence that uses the word", async () => {
    const out = await ai.checkSentence(haus, "Das Haus ist groß.");
    expect(() => sentenceCheckSchema.parse(out)).not.toThrow();
    expect(out.isCorrect).toBe(true);
    expect(out.score).toBe(70);
  });

  it("flags a sentence missing the word", async () => {
    const out = await ai.checkSentence(haus, "Ich gehe nach Hause.");
    expect(out.isCorrect).toBe(false);
    expect(out.score).toBeLessThan(70);
  });
});

describe("FallbackAIService.explainMeaning", () => {
  it("mentions the translation", async () => {
    const out = await ai.explainMeaning(haus);
    expect(out.simpleEnglish).toContain("house");
  });
});

describe("FallbackAIService.generateQuiz", () => {
  const words: WordContext[] = [
    { word: "Haus", translation: "house" },
    { word: "Hund", translation: "dog" },
    { word: "Katze", translation: "cat" },
    { word: "Baum", translation: "tree" },
  ];

  it("returns the requested number of schema-valid questions with the correct answer present", async () => {
    const quiz = await ai.generateQuiz(words, 3);
    expect(() => quizSchema.parse(quiz)).not.toThrow();
    expect(quiz.questions).toHaveLength(3);
    for (const q of quiz.questions) {
      expect(q.options[q.answerIndex]).toBeDefined();
      // The correct option text matches the explanation's translation.
      expect(q.explanation).toContain(q.options[q.answerIndex]!);
    }
  });
});
