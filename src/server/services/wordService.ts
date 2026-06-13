/** Word CRUD + filtered listing. */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { HttpError } from "@/lib/http";
import type { CreateWordInput, ListWordsQuery, UpdateWordInput } from "@/lib/validation";
import { toWordDTO } from "./mappers";
import { WEAK_SCORE } from "@/core/srs";

const withTags = { tags: true } satisfies Prisma.VocabularyWordInclude;

/** Upsert tags for a user and return connect refs. */
async function connectTags(userId: string, names: string[]) {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  return Promise.all(
    unique.map((name) =>
      prisma.tag.upsert({
        where: { userId_name: { userId, name } },
        create: { userId, name },
        update: {},
      }),
    ),
  ).then((tags) => tags.map((t) => ({ id: t.id })));
}

export async function listWords(userId: string, query: ListWordsQuery) {
  const now = new Date();
  const where: Prisma.VocabularyWordWhereInput = { userId };

  switch (query.filter) {
    case "archived":
      where.status = "ARCHIVED";
      break;
    case "mastered":
      where.status = "MASTERED";
      break;
    case "weak":
      where.status = "ACTIVE";
      where.masteryScore = { lt: WEAK_SCORE };
      break;
    case "due":
      where.status = "ACTIVE";
      where.OR = [{ recognitionDueAt: null }, { recognitionDueAt: { lte: now } }];
      break;
    default:
      where.status = { in: ["ACTIVE", "MASTERED"] };
  }

  if (query.partOfSpeech) where.partOfSpeech = query.partOfSpeech;
  if (query.level) where.level = query.level;
  if (query.tag) where.tags = { some: { name: query.tag } };
  if (query.q) {
    where.AND = [
      {
        OR: [
          { word: { contains: query.q, mode: "insensitive" } },
          { translation: { contains: query.q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const words = await prisma.vocabularyWord.findMany({
    where,
    include: withTags,
    orderBy: [{ masteryScore: "asc" }, { createdAt: "desc" }],
  });
  return words.map(toWordDTO);
}

export async function getWord(userId: string, id: string) {
  const word = await prisma.vocabularyWord.findFirst({ where: { id, userId }, include: withTags });
  if (!word) throw new HttpError(404, "Word not found");
  return toWordDTO(word);
}

export async function createWord(userId: string, input: CreateWordInput) {
  const tags = await connectTags(userId, input.tags);
  const word = await prisma.vocabularyWord.create({
    data: {
      userId,
      word: input.word,
      translation: input.translation,
      article: input.article,
      plural: input.plural,
      partOfSpeech: input.partOfSpeech,
      level: input.level,
      notes: input.notes,
      pronunciationHint: input.pronunciationHint,
      tags: { connect: tags },
      exampleSentences: input.exampleSentence
        ? { create: { kind: "SIMPLE", textDe: input.exampleSentence, source: "USER" } }
        : undefined,
    },
    include: withTags,
  });
  return toWordDTO(word);
}

export async function updateWord(userId: string, id: string, input: UpdateWordInput) {
  const existing = await prisma.vocabularyWord.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "Word not found");

  const tags = input.tags ? await connectTags(userId, input.tags) : undefined;
  const word = await prisma.vocabularyWord.update({
    where: { id },
    data: {
      word: input.word,
      translation: input.translation,
      article: input.article,
      plural: input.plural,
      partOfSpeech: input.partOfSpeech,
      level: input.level,
      notes: input.notes,
      pronunciationHint: input.pronunciationHint,
      ...(tags ? { tags: { set: tags } } : {}),
    },
    include: withTags,
  });
  return toWordDTO(word);
}

export async function deleteWord(userId: string, id: string) {
  const existing = await prisma.vocabularyWord.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "Word not found");
  await prisma.vocabularyWord.delete({ where: { id } });
}

export async function archiveWord(userId: string, id: string, archived: boolean) {
  const existing = await prisma.vocabularyWord.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "Word not found");
  const word = await prisma.vocabularyWord.update({
    where: { id },
    data: { status: archived ? "ARCHIVED" : "ACTIVE" },
    include: withTags,
  });
  return toWordDTO(word);
}
