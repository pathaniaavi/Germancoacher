/**
 * Core spaced-repetition types. Pure data — no Date mutation, no I/O.
 *
 * A word carries two of these states independently: RECOGNITION (do you know the
 * meaning / article / plural?) and PRODUCTION (can you use it in a sentence?).
 */

export type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export type ReviewDimension = "RECOGNITION" | "PRODUCTION";

export type WordStatus = "ACTIVE" | "ARCHIVED" | "MASTERED";

/** One side's scheduling state for a single word. */
export interface SrsState {
  /** Multiplier applied on GOOD reviews. Floored at {@link MIN_EASE}. */
  easeFactor: number;
  /** Current scheduling interval, in days. 0 for a brand-new card. */
  intervalDays: number;
  /** Consecutive successful reviews since the last lapse. */
  repetitions: number;
  /** Number of times the card lapsed (AGAIN while in the review regime). */
  lapses: number;
  /**
   * Index into {@link LEARNING_STEPS_DAYS} for cards still in the learning/relearning
   * regime. Equals {@link GRADUATED_STEP} once the card has graduated to review.
   */
  learningStep: number;
  /** When the card next becomes due. `null` means never scheduled (brand-new). */
  dueAt: Date | null;
  /** When the card was last reviewed. `null` if never. */
  lastReviewedAt: Date | null;
}

/** Derived 0..100 scores plus the resulting lifecycle status for a word. */
export interface WordScores {
  recognitionScore: number;
  productionScore: number;
  masteryScore: number;
  status: WordStatus;
  weak: boolean;
}
