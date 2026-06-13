/** Generate a topic vocabulary pack, normalize it, dedupe, and persist. */
import type { CefrLevel } from "@prisma/client";
import { prisma } from "@/server/db";
import { HttpError } from "@/lib/http";
import { getAIServiceForUser } from "@/server/ai";
import { builtinVocabularyFor } from "@/core/ai/fallback";
import { type GenerateTopicInput } from "@/lib/validation";
import type { GenerateTopicResult } from "@/lib/dto";
import { toWordDTO } from "./mappers";
import { normArticle, normPos } from "./normalize";

export async function generateTopicPack(
  userId: string,
  input: GenerateTopicInput,
): Promise<GenerateTopicResult> {
  const { service, usingClaude } = await getAIServiceForUser(userId);

  // Without a real key we can only serve built-in offline packs.
  if (!usingClaude && !builtinVocabularyFor(input.topic)) {
    throw new HttpError(
      400,
      `Offline mode only ships packs for Food, Family, and Numbers. Add your Anthropic API key in Settings to generate "${input.topic}".`,
    );
  }

  const { words } = await service.generateVocabulary(input.level, input.topic, input.count);

  const existing = await prisma.vocabularyWord.findMany({
    where: { userId },
    select: { word: true },
  });
  const have = new Set(existing.map((w) => w.word.toLowerCase()));

  const created = [];
  for (const w of words) {
    const key = w.word.trim().toLowerCase();
    if (!key || have.has(key)) continue;
    have.add(key);
    const row = await prisma.vocabularyWord.create({
      data: {
        userId,
        word: w.word.trim(),
        translation: w.translation.trim(),
        article: normArticle(w.article),
        plural: w.plural?.trim() || undefined,
        partOfSpeech: normPos(w.partOfSpeech),
        level: input.level as CefrLevel,
        topic: input.topic,
        exampleSentences: w.example
          ? { create: { kind: "SIMPLE", textDe: w.example, source: "AI" } }
          : undefined,
      },
      include: { tags: true },
    });
    created.push(toWordDTO(row));
  }

  return {
    topic: input.topic,
    level: input.level,
    created: created.length,
    skipped: words.length - created.length,
    words: created,
    source: usingClaude ? "claude" : "fallback",
  };
}
