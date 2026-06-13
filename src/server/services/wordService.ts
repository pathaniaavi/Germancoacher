/** Word CRUD + filtered listing. */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { HttpError } from "@/lib/http";
import type { CreateWordInput, ListWordsQuery, QuickAddInput, UpdateWordInput } from "@/lib/validation";
import type { QuickAddResult, WordPreview } from "@/lib/dto";
import { toWordDTO } from "./mappers";
import { normArticle, normLevel, normPos } from "./normalize";
import { getAIServiceForUser } from "@/server/ai";
import { lookupGerman } from "@/server/dictionary/wiktionary";
import type { WordLookup } from "@/core/ai/schemas";
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
  if (query.topic) where.topic = query.topic;
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
  const dup = await prisma.vocabularyWord.findFirst({
    where: { userId, word: { equals: input.word, mode: "insensitive" } },
    select: { id: true },
  });
  if (dup) throw new HttpError(409, `“${input.word}” is already in your deck`);

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

interface ResolvedDetails {
  translation: string;
  fields: WordLookup | null;
  source: QuickAddResult["source"];
}

/**
 * Resolve a word's details without saving. Dictionary-first (Wiktionary, free), then a typed
 * meaning, then AI. Throws 422 (needsTranslation) when nothing resolves.
 */
async function resolveWordDetails(
  userId: string,
  word: string,
  manualTranslation?: string,
): Promise<ResolvedDetails> {
  const trimmed = word.trim();
  const dict = await lookupGerman(trimmed);
  let fields: WordLookup | null = dict;
  let translation = "";
  let source: QuickAddResult["source"];

  if (manualTranslation?.trim()) {
    translation = manualTranslation.trim();
    source = "manual"; // user-typed meaning wins; keep dictionary grammar if present
  } else if (dict?.translation?.trim()) {
    translation = dict.translation.trim();
    source = "dictionary";
  } else {
    const { service, usingClaude } = await getAIServiceForUser(userId);
    source = "ai";
    if (usingClaude) {
      const ai = await service.lookupWord(trimmed);
      if (ai.translation?.trim()) {
        fields = ai;
        translation = ai.translation.trim();
      }
    }
  }

  if (!translation) throw new HttpError(422, "Add what this word means", { needsTranslation: true });

  // Clamp to the same limits createWordSchema enforces, so a preview always saves cleanly.
  translation = translation.slice(0, 200);
  if (fields) {
    fields = {
      ...fields,
      plural: fields.plural?.slice(0, 120),
      example: fields.example?.slice(0, 500),
      pronunciationHint: fields.pronunciationHint?.slice(0, 200),
    };
  }
  return { translation, fields, source };
}

/** Fetch a word's details for the Add preview — does NOT save. */
export async function previewWord(
  userId: string,
  word: string,
  manualTranslation?: string,
): Promise<WordPreview> {
  const trimmed = word.trim();
  const r = await resolveWordDetails(userId, trimmed, manualTranslation);
  const exists = Boolean(
    await prisma.vocabularyWord.findFirst({
      where: { userId, word: { equals: trimmed, mode: "insensitive" } },
      select: { id: true },
    }),
  );
  return {
    source: r.source,
    exists,
    details: {
      word: trimmed,
      translation: r.translation,
      article: normArticle(r.fields?.article),
      plural: r.fields?.plural?.trim() || null,
      partOfSpeech: normPos(r.fields?.partOfSpeech),
      level: normLevel(r.fields?.level),
      example: r.fields?.example?.trim() || null,
      pronunciationHint: r.fields?.pronunciationHint?.trim() || null,
    },
  };
}

/**
 * Add a word from just the German text (dictionary-first → AI → typed meaning), saving directly.
 * Throws 409 on duplicates and 422 (needsTranslation) when nothing resolves.
 */
export async function quickAddWord(userId: string, input: QuickAddInput): Promise<QuickAddResult> {
  const trimmed = input.word.trim();
  const dup = await prisma.vocabularyWord.findFirst({
    where: { userId, word: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  if (dup) throw new HttpError(409, `“${trimmed}” is already in your deck`);

  const { translation, fields, source } = await resolveWordDetails(userId, trimmed, input.translation);

  const word = await prisma.vocabularyWord.create({
    data: {
      userId,
      word: trimmed,
      translation,
      article: normArticle(fields?.article),
      plural: fields?.plural?.trim() || undefined,
      partOfSpeech: normPos(fields?.partOfSpeech),
      level: normLevel(fields?.level),
      pronunciationHint: fields?.pronunciationHint?.trim() || undefined,
      topic: input.topic,
      exampleSentences: fields?.example
        ? { create: { kind: "SIMPLE", textDe: fields.example, source: source === "ai" ? "AI" : "USER" } }
        : undefined,
    },
    include: withTags,
  });

  return { word: toWordDTO(word), source };
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
