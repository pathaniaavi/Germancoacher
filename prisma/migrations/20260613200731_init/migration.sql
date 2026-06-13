-- CreateEnum
CREATE TYPE "Article" AS ENUM ('DER', 'DIE', 'DAS', 'NONE');

-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PRONOUN', 'PREPOSITION', 'CONJUNCTION', 'ARTICLE', 'NUMERAL', 'INTERJECTION', 'PHRASE', 'OTHER');

-- CreateEnum
CREATE TYPE "CefrLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "WordStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'MASTERED');

-- CreateEnum
CREATE TYPE "SentenceKind" AS ENUM ('SIMPLE', 'REAL_LIFE', 'CLOZE');

-- CreateEnum
CREATE TYPE "SentenceSource" AS ENUM ('USER', 'AI');

-- CreateEnum
CREATE TYPE "ReviewDimension" AS ENUM ('RECOGNITION', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateEnum
CREATE TYPE "ReviewMode" AS ENUM ('FLASHCARD', 'TYPING', 'SENTENCE', 'CLOZE', 'DIFFICULT');

-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('FLASHCARD', 'TYPING', 'SENTENCE_BUILD', 'CLOZE', 'WRITE_OWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyReviewLimit" INTEGER NOT NULL DEFAULT 30,
    "newCardsPerDay" INTEGER NOT NULL DEFAULT 10,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiModel" TEXT NOT NULL DEFAULT 'claude-opus-4-8',

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "article" "Article" NOT NULL DEFAULT 'NONE',
    "plural" TEXT,
    "partOfSpeech" "PartOfSpeech" NOT NULL DEFAULT 'OTHER',
    "level" "CefrLevel" NOT NULL DEFAULT 'A1',
    "notes" TEXT,
    "pronunciationHint" TEXT,
    "status" "WordStatus" NOT NULL DEFAULT 'ACTIVE',
    "recognitionEase" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "recognitionIntervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recognitionReps" INTEGER NOT NULL DEFAULT 0,
    "recognitionLapses" INTEGER NOT NULL DEFAULT 0,
    "recognitionLearningStep" INTEGER NOT NULL DEFAULT 0,
    "recognitionDueAt" TIMESTAMP(3),
    "recognitionLastReviewedAt" TIMESTAMP(3),
    "productionEase" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "productionIntervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productionReps" INTEGER NOT NULL DEFAULT 0,
    "productionLapses" INTEGER NOT NULL DEFAULT 0,
    "productionLearningStep" INTEGER NOT NULL DEFAULT 0,
    "productionDueAt" TIMESTAMP(3),
    "productionLastReviewedAt" TIMESTAMP(3),
    "recognitionScore" INTEGER NOT NULL DEFAULT 0,
    "productionScore" INTEGER NOT NULL DEFAULT 0,
    "masteryScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExampleSentence" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "kind" "SentenceKind" NOT NULL,
    "textDe" TEXT NOT NULL,
    "textEn" TEXT,
    "clozeAnswer" TEXT,
    "clozeStart" INTEGER,
    "source" "SentenceSource" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExampleSentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "ReviewMode" NOT NULL DEFAULT 'FLASHCARD',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "cardCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "dimension" "ReviewDimension" NOT NULL,
    "rating" "Rating" NOT NULL,
    "prevInterval" DOUBLE PRECISION NOT NULL,
    "nextInterval" DOUBLE PRECISION NOT NULL,
    "prevEase" DOUBLE PRECISION NOT NULL,
    "nextEase" DOUBLE PRECISION NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "mode" "PracticeMode" NOT NULL DEFAULT 'WRITE_OWN',
    "userSentence" TEXT NOT NULL,
    "aiVerdict" JSONB,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_WordTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_WordTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "VocabularyWord_userId_status_idx" ON "VocabularyWord"("userId", "status");

-- CreateIndex
CREATE INDEX "VocabularyWord_userId_recognitionDueAt_idx" ON "VocabularyWord"("userId", "recognitionDueAt");

-- CreateIndex
CREATE INDEX "VocabularyWord_userId_productionDueAt_idx" ON "VocabularyWord"("userId", "productionDueAt");

-- CreateIndex
CREATE INDEX "VocabularyWord_userId_masteryScore_idx" ON "VocabularyWord"("userId", "masteryScore");

-- CreateIndex
CREATE INDEX "VocabularyWord_userId_partOfSpeech_idx" ON "VocabularyWord"("userId", "partOfSpeech");

-- CreateIndex
CREATE INDEX "VocabularyWord_userId_level_idx" ON "VocabularyWord"("userId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- CreateIndex
CREATE INDEX "ExampleSentence_wordId_idx" ON "ExampleSentence"("wordId");

-- CreateIndex
CREATE INDEX "ReviewSession_userId_startedAt_idx" ON "ReviewSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ReviewResult_wordId_answeredAt_idx" ON "ReviewResult"("wordId", "answeredAt");

-- CreateIndex
CREATE INDEX "ReviewResult_userId_answeredAt_idx" ON "ReviewResult"("userId", "answeredAt");

-- CreateIndex
CREATE INDEX "PracticeAttempt_userId_createdAt_idx" ON "PracticeAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PracticeAttempt_wordId_createdAt_idx" ON "PracticeAttempt"("wordId", "createdAt");

-- CreateIndex
CREATE INDEX "_WordTags_B_index" ON "_WordTags"("B");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyWord" ADD CONSTRAINT "VocabularyWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleSentence" ADD CONSTRAINT "ExampleSentence_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResult" ADD CONSTRAINT "ReviewResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResult" ADD CONSTRAINT "ReviewResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResult" ADD CONSTRAINT "ReviewResult_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WordTags" ADD CONSTRAINT "_WordTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WordTags" ADD CONSTRAINT "_WordTags_B_fkey" FOREIGN KEY ("B") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
