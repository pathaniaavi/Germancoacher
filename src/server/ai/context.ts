/** Build WordContext objects (the AI's view of a word) from the database. */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { HttpError } from "@/lib/http";
import { WEAK_SCORE } from "@/core/srs";
import type { ArticleCode, WordContext } from "@/core/ai/types";

export async function wordContext(userId: string, id: string): Promise<WordContext> {
  const w = await prisma.vocabularyWord.findFirst({ where: { id, userId } });
  if (!w) throw new HttpError(404, "Word not found");
  return {
    word: w.word,
    translation: w.translation,
    article: w.article as ArticleCode,
    plural: w.plural ?? undefined,
    partOfSpeech: w.partOfSpeech,
    level: w.level,
    notes: w.notes ?? undefined,
  };
}

export async function quizWordContexts(
  userId: string,
  filter: "all" | "due" | "weak",
  now: Date = new Date(),
): Promise<WordContext[]> {
  const where: Prisma.VocabularyWordWhereInput =
    filter === "weak"
      ? { userId, status: "ACTIVE", masteryScore: { lt: WEAK_SCORE } }
      : filter === "due"
        ? {
            userId,
            status: "ACTIVE",
            OR: [{ recognitionDueAt: null }, { recognitionDueAt: { lte: now } }],
          }
        : { userId, status: { in: ["ACTIVE", "MASTERED"] } };

  const words = await prisma.vocabularyWord.findMany({ where, take: 30 });
  return words.map((w) => ({
    word: w.word,
    translation: w.translation,
    article: w.article as ArticleCode,
    partOfSpeech: w.partOfSpeech,
    level: w.level,
  }));
}
