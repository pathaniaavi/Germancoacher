/**
 * Seed a demo user with a handful of starter words.
 * Run with: npm run db:seed   (requires DATABASE_URL pointing at a running Postgres)
 */
import { PrismaClient } from "@prisma/client";

// `tsx` (unlike the Prisma CLI) does not auto-load .env, so load it ourselves.
const loadEnvFile = (process as unknown as { loadEnvFile?: (path?: string) => void }).loadEnvFile;
try {
  loadEnvFile?.();
} catch {
  /* .env is optional */
}

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

const WORDS = [
  { word: "Tisch", translation: "table", article: "DER", plural: "Tische", partOfSpeech: "NOUN", level: "A1", dueOffsetDays: -1 },
  { word: "Haus", translation: "house", article: "DAS", plural: "Häuser", partOfSpeech: "NOUN", level: "A1", dueOffsetDays: -3 },
  { word: "Katze", translation: "cat", article: "DIE", plural: "Katzen", partOfSpeech: "NOUN", level: "A1", dueOffsetDays: null },
  { word: "gehen", translation: "to go", article: "NONE", plural: null, partOfSpeech: "VERB", level: "A1", dueOffsetDays: 0 },
  { word: "schnell", translation: "fast", article: "NONE", plural: null, partOfSpeech: "ADJECTIVE", level: "A1", dueOffsetDays: null },
  { word: "Entscheidung", translation: "decision", article: "DIE", plural: "Entscheidungen", partOfSpeech: "NOUN", level: "B1", dueOffsetDays: -5 },
  { word: "obwohl", translation: "although", article: "NONE", plural: null, partOfSpeech: "CONJUNCTION", level: "B1", dueOffsetDays: 2 },
  { word: "Verabredung", translation: "appointment / date", article: "DIE", plural: "Verabredungen", partOfSpeech: "NOUN", level: "B2", dueOffsetDays: null },
] as const;

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: { email: "demo@example.com", name: "Demo Learner" },
  });
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  for (const w of WORDS) {
    const due = w.dueOffsetDays === null ? null : new Date(now + w.dueOffsetDays * DAY);
    await prisma.vocabularyWord.create({
      data: {
        userId: user.id,
        word: w.word,
        translation: w.translation,
        article: w.article,
        plural: w.plural ?? undefined,
        partOfSpeech: w.partOfSpeech,
        level: w.level,
        recognitionDueAt: due,
        // Brand-new cards keep schema defaults (interval 0, ease 2.5, scores 0).
        ...(due ? { recognitionIntervalDays: 4, recognitionReps: 1, recognitionLearningStep: 2 } : {}),
      },
    });
  }

  console.log(`Seeded ${WORDS.length} words for ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
