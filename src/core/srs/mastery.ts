/**
 * Derived competence scoring. Turns raw SRS state into 0..100 scores and a
 * lifecycle status.
 *
 * Design choice (the product thesis): masteryScore weights PRODUCTION higher than
 * RECOGNITION. A word you recognize perfectly but have never *used* in a sentence
 * tops out around 45 — honestly reflecting "you know it, but can't yet use it."
 * Mastery requires both sides to be strong.
 */

import { DEFAULT_EASE, MIN_EASE } from "./scheduler";
import type { SrsState, WordScores, WordStatus } from "./types";

// --- Tunable constants ---------------------------------------------------

/** Interval (days) at which a dimension's interval-stability component saturates. */
export const MASTERY_INTERVAL_TARGET_DAYS = 60;
/** Repetitions at which the reps component saturates. */
export const MASTERY_REPS_TARGET = 8;
/** Score points subtracted per lapse. */
export const MASTERY_LAPSE_PENALTY = 6;

/** A dimension counts as "strong" at or above this score with a long-enough interval. */
export const STRONG_SCORE = 80;
export const STRONG_INTERVAL_DAYS = 21;

/** Below this masteryScore (or with a recent lapse) a word is flagged weak. */
export const WEAK_SCORE = 40;

/** masteryScore = RECOGNITION_WEIGHT·recognition + PRODUCTION_WEIGHT·production. */
export const RECOGNITION_WEIGHT = 0.45;
export const PRODUCTION_WEIGHT = 0.55;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const clamp100 = (n: number): number => Math.max(0, Math.min(100, n));

/**
 * Score a single dimension 0..100 from its SRS state.
 * A never-reviewed dimension scores 0 (default ease alone earns nothing).
 */
export function dimensionScore(state: SrsState): number {
  if (state.repetitions === 0 && state.intervalDays === 0) return 0;

  const intervalStability = clamp01(
    Math.log1p(state.intervalDays) / Math.log1p(MASTERY_INTERVAL_TARGET_DAYS),
  );
  const easeNorm = clamp01(
    (state.easeFactor - MIN_EASE) / (DEFAULT_EASE + 0.5 - MIN_EASE),
  );
  const repsNorm = clamp01(state.repetitions / MASTERY_REPS_TARGET);

  const raw = 100 * (0.55 * intervalStability + 0.2 * easeNorm + 0.25 * repsNorm);
  const penalty = MASTERY_LAPSE_PENALTY * state.lapses;

  return clamp100(Math.round(raw - penalty));
}

/** Is one dimension strong enough to count toward mastery? */
export function isDimensionStrong(state: SrsState): boolean {
  return (
    state.intervalDays >= STRONG_INTERVAL_DAYS && dimensionScore(state) >= STRONG_SCORE
  );
}

/**
 * Compute the full derived scoring for a word from both dimension states.
 * `recentLapse` lets a caller force the weak flag (e.g. an AGAIN in the last session).
 */
export function computeWordScores(
  recognition: SrsState,
  production: SrsState,
  opts: { archived?: boolean; recentLapse?: boolean } = {},
): WordScores {
  const recognitionScore = dimensionScore(recognition);
  const productionScore = dimensionScore(production);
  const masteryScore = clamp100(
    Math.round(RECOGNITION_WEIGHT * recognitionScore + PRODUCTION_WEIGHT * productionScore),
  );

  const mastered = isDimensionStrong(recognition) && isDimensionStrong(production);
  const weak = masteryScore < WEAK_SCORE || Boolean(opts.recentLapse);

  let status: WordStatus = "ACTIVE";
  if (opts.archived) status = "ARCHIVED";
  else if (mastered) status = "MASTERED";

  return { recognitionScore, productionScore, masteryScore, status, weak };
}
