/** Builds the guided learning path: curriculum units + per-topic progress + what's next. */
import { prisma } from "@/server/db";
import { CURRICULUM } from "@/server/curriculum";
import type { LearnPath, TopicProgress } from "@/lib/dto";

const LEARNED_RATIO = 0.6;

interface Group {
  count: number;
  learned: number;
  level: string;
}

export async function getPath(userId: string): Promise<LearnPath> {
  const words = await prisma.vocabularyWord.findMany({
    where: { userId, status: { in: ["ACTIVE", "MASTERED"] }, topic: { not: null } },
    select: { topic: true, level: true, recognitionReps: true, masteryScore: true },
  });

  const byTopic = new Map<string, Group>();
  for (const w of words) {
    if (!w.topic) continue;
    const g = byTopic.get(w.topic) ?? { count: 0, learned: 0, level: w.level };
    g.count += 1;
    if (w.recognitionReps >= 1 && w.masteryScore >= 25) g.learned += 1;
    byTopic.set(w.topic, g);
  }

  const progressFor = (level: string, topic: string): TopicProgress => {
    const g = byTopic.get(topic);
    const wordCount = g?.count ?? 0;
    const learnedCount = g?.learned ?? 0;
    return {
      level,
      topic,
      wordCount,
      learnedCount,
      percent: wordCount ? Math.round((learnedCount / wordCount) * 100) : 0,
      learned: wordCount > 0 && learnedCount / wordCount >= LEARNED_RATIO,
    };
  };

  const units = CURRICULUM.map((u) => progressFor(u.level, u.topic));
  const curriculumTopics = new Set(CURRICULUM.map((u) => u.topic));
  const custom = [...byTopic.entries()]
    .filter(([topic]) => !curriculumTopics.has(topic))
    .map(([topic, g]) => progressFor(g.level, topic));

  const recommended = units.find((u) => !u.learned)?.topic ?? null;

  return { units, custom, recommended };
}
