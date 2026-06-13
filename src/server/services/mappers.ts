/** Translate between Prisma rows, the pure SRS engine, and wire DTOs. */
import type { Tag, VocabularyWord } from "@prisma/client";
import type { SrsState, ReviewDimension } from "@/core/srs";
import type { WordDTO } from "@/lib/dto";

export type WordWithTags = VocabularyWord & { tags: Tag[] };

/** Read one dimension's scheduling state out of a word row. */
export function toSrsState(word: VocabularyWord, dimension: ReviewDimension): SrsState {
  if (dimension === "RECOGNITION") {
    return {
      easeFactor: word.recognitionEase,
      intervalDays: word.recognitionIntervalDays,
      repetitions: word.recognitionReps,
      lapses: word.recognitionLapses,
      learningStep: word.recognitionLearningStep,
      dueAt: word.recognitionDueAt,
      lastReviewedAt: word.recognitionLastReviewedAt,
    };
  }
  return {
    easeFactor: word.productionEase,
    intervalDays: word.productionIntervalDays,
    repetitions: word.productionReps,
    lapses: word.productionLapses,
    learningStep: word.productionLearningStep,
    dueAt: word.productionDueAt,
    lastReviewedAt: word.productionLastReviewedAt,
  };
}

/** Produce the Prisma update columns for one dimension's new state. */
export function srsStateToColumns(state: SrsState, dimension: ReviewDimension) {
  if (dimension === "RECOGNITION") {
    return {
      recognitionEase: state.easeFactor,
      recognitionIntervalDays: state.intervalDays,
      recognitionReps: state.repetitions,
      recognitionLapses: state.lapses,
      recognitionLearningStep: state.learningStep,
      recognitionDueAt: state.dueAt,
      recognitionLastReviewedAt: state.lastReviewedAt,
    };
  }
  return {
    productionEase: state.easeFactor,
    productionIntervalDays: state.intervalDays,
    productionReps: state.repetitions,
    productionLapses: state.lapses,
    productionLearningStep: state.learningStep,
    productionDueAt: state.dueAt,
    productionLastReviewedAt: state.lastReviewedAt,
  };
}

export function toWordDTO(word: WordWithTags): WordDTO {
  return {
    id: word.id,
    word: word.word,
    translation: word.translation,
    article: word.article,
    plural: word.plural,
    partOfSpeech: word.partOfSpeech,
    level: word.level,
    notes: word.notes,
    pronunciationHint: word.pronunciationHint,
    status: word.status,
    recognitionScore: word.recognitionScore,
    productionScore: word.productionScore,
    masteryScore: word.masteryScore,
    recognitionDueAt: word.recognitionDueAt?.toISOString() ?? null,
    productionDueAt: word.productionDueAt?.toISOString() ?? null,
    recognitionIntervalDays: word.recognitionIntervalDays,
    productionIntervalDays: word.productionIntervalDays,
    tags: word.tags.map((t) => t.name),
    createdAt: word.createdAt.toISOString(),
    updatedAt: word.updatedAt.toISOString(),
  };
}
