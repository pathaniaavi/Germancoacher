/** Builds the review queue and applies ratings through the SRS engine. */
import { prisma } from "@/server/db";
import { HttpError } from "@/lib/http";
import {
  buildQueue,
  computeWordScores,
  schedule,
  WEAK_SCORE,
  type QueueCard,
} from "@/core/srs";
import type { ReviewAnswerInput } from "@/lib/validation";
import type { ReviewAnswerResult, ReviewQueueItem } from "@/lib/dto";
import { srsStateToColumns, toSrsState, toWordDTO } from "./mappers";

async function userLimits(userId: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  return {
    dailyLimit: settings?.dailyReviewLimit ?? 30,
    newCardsPerDay: settings?.newCardsPerDay ?? 10,
  };
}

/** Ordered list of words to review now, capped by the user's daily limits. */
export async function buildReviewQueue(
  userId: string,
  mode: string,
  now: Date = new Date(),
): Promise<ReviewQueueItem[]> {
  const words = await prisma.vocabularyWord.findMany({
    where: { userId, status: "ACTIVE" },
    include: { tags: true },
  });

  const pool =
    mode === "DIFFICULT" ? words.filter((w) => w.masteryScore < WEAK_SCORE) : words;

  const cards: QueueCard[] = pool.map((w) => ({
    id: w.id,
    dueAt: w.recognitionDueAt,
    masteryScore: w.masteryScore,
    status: w.status,
  }));

  const { dailyLimit, newCardsPerDay } = await userLimits(userId);
  const ordered = buildQueue(cards, now, { dailyLimit, newCardsPerDay });

  const byId = new Map(pool.map((w) => [w.id, w]));
  return ordered.map((c) => {
    const word = byId.get(c.id)!;
    const s = toSrsState(word, "RECOGNITION");
    return {
      ...toWordDTO(word),
      srs: {
        easeFactor: s.easeFactor,
        intervalDays: s.intervalDays,
        repetitions: s.repetitions,
        lapses: s.lapses,
        learningStep: s.learningStep,
      },
    };
  });
}

async function getOrCreateOpenSession(userId: string, mode: ReviewAnswerInput["mode"]) {
  const open = await prisma.reviewSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (open) return open;
  return prisma.reviewSession.create({ data: { userId, mode } });
}

export async function answerReview(
  userId: string,
  input: ReviewAnswerInput,
  now: Date = new Date(),
): Promise<ReviewAnswerResult> {
  const word = await prisma.vocabularyWord.findFirst({
    where: { id: input.wordId, userId },
    include: { tags: true },
  });
  if (!word) throw new HttpError(404, "Word not found");

  const prevState = toSrsState(word, input.dimension);
  const nextState = schedule(prevState, input.rating, now);

  // Recompute derived scores from both dimensions (one just changed).
  const recognition = input.dimension === "RECOGNITION" ? nextState : toSrsState(word, "RECOGNITION");
  const production = input.dimension === "PRODUCTION" ? nextState : toSrsState(word, "PRODUCTION");
  const scores = computeWordScores(recognition, production, {
    archived: word.status === "ARCHIVED",
    recentLapse: input.rating === "AGAIN",
  });

  const session = await getOrCreateOpenSession(userId, input.mode);

  const [updated] = await prisma.$transaction([
    prisma.vocabularyWord.update({
      where: { id: word.id },
      data: {
        ...srsStateToColumns(nextState, input.dimension),
        recognitionScore: scores.recognitionScore,
        productionScore: scores.productionScore,
        masteryScore: scores.masteryScore,
        status: scores.status,
      },
      include: { tags: true },
    }),
    prisma.reviewResult.create({
      data: {
        sessionId: session.id,
        userId,
        wordId: word.id,
        dimension: input.dimension,
        rating: input.rating,
        prevInterval: prevState.intervalDays,
        nextInterval: nextState.intervalDays,
        prevEase: prevState.easeFactor,
        nextEase: nextState.easeFactor,
        answeredAt: now,
      },
    }),
    prisma.reviewSession.update({
      where: { id: session.id },
      data: { cardCount: { increment: 1 } },
    }),
  ]);

  return {
    word: toWordDTO(updated),
    nextDueAt: nextState.dueAt?.toISOString() ?? null,
    nextIntervalDays: nextState.intervalDays,
  };
}
