/** Coerce loose AI strings into the Prisma enums, defaulting safely. */
import type { Article, CefrLevel, PartOfSpeech } from "@prisma/client";
import { ARTICLES, LEVELS, PARTS_OF_SPEECH } from "@/lib/validation";

export const normArticle = (a?: string): Article => {
  const up = (a ?? "").toUpperCase();
  return (ARTICLES as readonly string[]).includes(up) ? (up as Article) : "NONE";
};

export const normPos = (p?: string): PartOfSpeech => {
  const up = (p ?? "").toUpperCase();
  return (PARTS_OF_SPEECH as readonly string[]).includes(up) ? (up as PartOfSpeech) : "OTHER";
};

export const normLevel = (l?: string): CefrLevel => {
  const up = (l ?? "").toUpperCase();
  return (LEVELS as readonly string[]).includes(up) ? (up as CefrLevel) : "A1";
};
