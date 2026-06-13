/**
 * Records a write-your-own-sentence attempt, grades it with AI, and advances the word's
 * PRODUCTION schedule from that grade — closing the loop on two-sided mastery.
 */
import { prisma } from "@/server/db";
import { getAIServiceForUser } from "@/server/ai";
import {
  computeWordScores,
  ratingFromGrade,
  schedule,
  type Rating,
} from "@/core/srs";
import { srsStateToColumns, toSrsState } from "./mappers";
import { HttpError } from "@/lib/http";
import type { PracticeAttemptInput } from "@/lib/validation";
import type { PracticeResult } from "@/lib/dto";
import type { ArticleCode, WordContext } from "@/core/ai/types";

export async function recordAttempt(
  userId: string,
  input: PracticeAttemptInput,
  now: Date = new Date(),
): Promise<PracticeResult> {
  const word = await prisma.vocabularyWord.findFirst({ where: { id: input.wordId, userId } });
  if (!word) throw new HttpError(404, "Word not found");

  const ctx: WordContext = {
    word: word.word,
    translation: word.translation,
    article: word.article as ArticleCode,
    plural: word.plural ?? undefined,
    partOfSpeech: word.partOfSpeech,
    level: word.level,
    notes: word.notes ?? undefined,
  };

  const { service } = await getAIServiceForUser(userId);
  const verdict = await service.checkSentence(ctx, input.userSentence);
  const rating: Rating = ratingFromGrade(verdict);

  // Advance the PRODUCTION schedule and recompute derived scores.
  const nextProduction = schedule(toSrsState(word, "PRODUCTION"), rating, now);
  const scores = computeWordScores(toSrsState(word, "RECOGNITION"), nextProduction, {
    archived: word.status === "ARCHIVED",
    recentLapse: rating === "AGAIN",
  });

  const [attempt] = await prisma.$transaction([
    prisma.practiceAttempt.create({
      data: {
        userId,
        wordId: word.id,
        mode: input.mode,
        userSentence: input.userSentence,
        aiVerdict: verdict,
        score: verdict.score,
      },
    }),
    prisma.vocabularyWord.update({
      where: { id: word.id },
      data: {
        ...srsStateToColumns(nextProduction, "PRODUCTION"),
        recognitionScore: scores.recognitionScore,
        productionScore: scores.productionScore,
        masteryScore: scores.masteryScore,
        status: scores.status,
      },
    }),
  ]);

  return {
    attemptId: attempt.id,
    rating,
    verdict,
    productionScore: scores.productionScore,
    masteryScore: scores.masteryScore,
    nextDueAt: nextProduction.dueAt?.toISOString() ?? null,
  };
}
