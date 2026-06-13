/** Dashboard metrics: totals, due/reviewed today, mastery, weak words, streak. */
import { prisma } from "@/server/db";
import { WEAK_SCORE } from "@/core/srs";
import type { StatsSummary } from "@/lib/dto";

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (d: Date): Date => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const dayKey = (d: Date): string => startOfDay(d).toISOString().slice(0, 10);

export async function getSummary(userId: string, now: Date = new Date()): Promise<StatsSummary> {
  const todayStart = startOfDay(now);

  const [total, dueToday, reviewedToday, mastered, weak] = await Promise.all([
    prisma.vocabularyWord.count({ where: { userId, status: { in: ["ACTIVE", "MASTERED"] } } }),
    prisma.vocabularyWord.count({
      where: {
        userId,
        status: "ACTIVE",
        OR: [{ recognitionDueAt: null }, { recognitionDueAt: { lte: now } }],
      },
    }),
    prisma.reviewResult.count({ where: { userId, answeredAt: { gte: todayStart } } }),
    prisma.vocabularyWord.count({ where: { userId, status: "MASTERED" } }),
    prisma.vocabularyWord.count({
      where: { userId, status: "ACTIVE", masteryScore: { lt: WEAK_SCORE } },
    }),
  ]);

  return { total, dueToday, reviewedToday, mastered, weak, streak: await getStreak(userId, now) };
}

/** Consecutive days (ending today or yesterday) that have at least one review. */
export async function getStreak(userId: string, now: Date = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 180 * DAY_MS);
  const results = await prisma.reviewResult.findMany({
    where: { userId, answeredAt: { gte: since } },
    select: { answeredAt: true },
  });
  const days = new Set(results.map((r) => dayKey(r.answeredAt)));
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = startOfDay(now);
  // Allow the streak to be "alive" if today has no review yet but yesterday did.
  if (!days.has(dayKey(cursor))) cursor.setTime(cursor.getTime() - DAY_MS);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setTime(cursor.getTime() - DAY_MS);
  }
  return streak;
}

export async function getWeeklyActivity(
  userId: string,
  now: Date = new Date(),
): Promise<{ date: string; count: number }[]> {
  const since = startOfDay(new Date(now.getTime() - 6 * DAY_MS));
  const results = await prisma.reviewResult.findMany({
    where: { userId, answeredAt: { gte: since } },
    select: { answeredAt: true },
  });
  const counts = new Map<string, number>();
  for (const r of results) {
    const key = dayKey(r.answeredAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since.getTime() + i * DAY_MS);
    const key = dayKey(d);
    return { date: key, count: counts.get(key) ?? 0 };
  });
}
