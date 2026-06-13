/**
 * Maps an AI sentence-grading verdict to an SRS rating, so a practice attempt feeds
 * the PRODUCTION schedule the same way a self-rating feeds RECOGNITION.
 *
 *   wrong / very low  -> AGAIN
 *   correct but rough -> HARD
 *   solid             -> GOOD
 *   excellent         -> EASY
 */
import type { Rating } from "./types";

export interface Grade {
  isCorrect: boolean;
  /** 0..100 quality score from the grader. */
  score: number;
}

export const GRADE_HARD_THRESHOLD = 50;
export const GRADE_GOOD_THRESHOLD = 70;
export const GRADE_EASY_THRESHOLD = 90;

export function ratingFromGrade(grade: Grade): Rating {
  if (!grade.isCorrect || grade.score < GRADE_HARD_THRESHOLD) return "AGAIN";
  if (grade.score < GRADE_GOOD_THRESHOLD) return "HARD";
  if (grade.score < GRADE_EASY_THRESHOLD) return "GOOD";
  return "EASY";
}
