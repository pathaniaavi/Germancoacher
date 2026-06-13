-- AlterTable
ALTER TABLE "VocabularyWord" ADD COLUMN     "topic" TEXT;

-- CreateIndex
CREATE INDEX "VocabularyWord_userId_topic_idx" ON "VocabularyWord"("userId", "topic");
