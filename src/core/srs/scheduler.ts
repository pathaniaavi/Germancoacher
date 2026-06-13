/**
 * SuperMemo-2 variant with the 4-button (Again / Hard / Good / Easy) mapping.
 *
 * Two regimes:
 *  - LEARNING/RELEARNING: a new (or lapsed) card walks the steps in LEARNING_STEPS_DAYS.
 *    Ratings move it through steps; ease is NOT changed here (matches Anki).
 *  - REVIEW: once graduated, intervals grow by easeFactor and the table below applies.
 *
 *  | Rating | Review interval        | Ease Δ | Reps                       |
 *  | Again  | back to learning step  | -0.20  | reset 0, lapses++          |
 *  | Hard   | prev × 1.2             | -0.15  | +1                         |
 *  | Good   | prev × ease            |  0     | +1                         |
 *  | Easy   | prev × ease × 1.3      | +0.15  | +1                         |
 *
 * All functions are pure: `schedule` returns a new SrsState and never mutates its input.
 */

import type { Rating, SrsState } from "./types";

// --- Tunable constants ---------------------------------------------------

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;

export const HARD_INTERVAL_MULT = 1.2;
export const EASY_BONUS = 1.3;

export const EASE_DELTA_AGAIN = -0.2;
export const EASE_DELTA_HARD = -0.15;
export const EASE_DELTA_EASY = 0.15;

const MINUTE_IN_DAYS = 1 / 1440;

/** Steps a learning/relearning card walks before graduating: 10 minutes, then 1 day. */
export const LEARNING_STEPS_DAYS = [10 * MINUTE_IN_DAYS, 1];

/** Sentinel learningStep value meaning "graduated to the review regime". */
export const GRADUATED_STEP = LEARNING_STEPS_DAYS.length;

/** Interval (days) granted when a card graduates via GOOD. */
export const GRADUATING_INTERVAL_DAYS = 1;
/** Interval (days) granted when a card graduates early via EASY. */
export const EASY_GRADUATING_INTERVAL_DAYS = 4;

/** Hard cap so intervals can't run away. */
export const MAX_INTERVAL_DAYS = 365 * 5;

// --- Helpers -------------------------------------------------------------

const clampEase = (ease: number): number => Math.max(MIN_EASE, ease);

const clampInterval = (days: number): number => Math.min(MAX_INTERVAL_DAYS, days);

const addDays = (from: Date, days: number): Date =>
  new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

const isLearning = (state: SrsState): boolean => state.learningStep < GRADUATED_STEP;

/** A fresh, never-reviewed state for one dimension of a word. */
export function initialSrsState(): SrsState {
  return {
    easeFactor: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    learningStep: 0,
    dueAt: null,
    lastReviewedAt: null,
  };
}

// --- Core scheduling -----------------------------------------------------

/**
 * Apply a rating to a card and return its next state.
 * @param state current scheduling state for one dimension
 * @param rating the user's self-assessment
 * @param now the moment the review happened (injected for testability)
 */
export function schedule(state: SrsState, rating: Rating, now: Date): SrsState {
  return isLearning(state)
    ? scheduleLearning(state, rating, now)
    : scheduleReview(state, rating, now);
}

function scheduleLearning(state: SrsState, rating: Rating, now: Date): SrsState {
  const base = { ...state, lastReviewedAt: now };

  switch (rating) {
    case "AGAIN": {
      const interval = LEARNING_STEPS_DAYS[0]!;
      return {
        ...base,
        learningStep: 0,
        intervalDays: interval,
        repetitions: 0,
        dueAt: addDays(now, interval),
      };
    }
    case "HARD": {
      // Repeat the current step.
      const step = Math.min(state.learningStep, LEARNING_STEPS_DAYS.length - 1);
      const interval = LEARNING_STEPS_DAYS[step]!;
      return {
        ...base,
        learningStep: step,
        intervalDays: interval,
        dueAt: addDays(now, interval),
      };
    }
    case "GOOD": {
      const next = state.learningStep + 1;
      if (next < LEARNING_STEPS_DAYS.length) {
        const interval = LEARNING_STEPS_DAYS[next]!;
        return {
          ...base,
          learningStep: next,
          intervalDays: interval,
          dueAt: addDays(now, interval),
        };
      }
      // Graduate.
      return {
        ...base,
        learningStep: GRADUATED_STEP,
        intervalDays: GRADUATING_INTERVAL_DAYS,
        repetitions: 1,
        dueAt: addDays(now, GRADUATING_INTERVAL_DAYS),
      };
    }
    case "EASY": {
      // Graduate immediately with the easy interval.
      return {
        ...base,
        learningStep: GRADUATED_STEP,
        intervalDays: EASY_GRADUATING_INTERVAL_DAYS,
        repetitions: 1,
        dueAt: addDays(now, EASY_GRADUATING_INTERVAL_DAYS),
      };
    }
  }
}

function scheduleReview(state: SrsState, rating: Rating, now: Date): SrsState {
  const base = { ...state, lastReviewedAt: now };
  const prev = state.intervalDays;

  switch (rating) {
    case "AGAIN": {
      // Lapse: drop back into relearning at the first step.
      const interval = LEARNING_STEPS_DAYS[0]!;
      return {
        ...base,
        easeFactor: clampEase(state.easeFactor + EASE_DELTA_AGAIN),
        intervalDays: interval,
        repetitions: 0,
        lapses: state.lapses + 1,
        learningStep: 0,
        dueAt: addDays(now, interval),
      };
    }
    case "HARD": {
      const ease = clampEase(state.easeFactor + EASE_DELTA_HARD);
      const interval = clampInterval(Math.max(1, prev * HARD_INTERVAL_MULT));
      return {
        ...base,
        easeFactor: ease,
        intervalDays: interval,
        repetitions: state.repetitions + 1,
        dueAt: addDays(now, interval),
      };
    }
    case "GOOD": {
      const ease = state.easeFactor;
      const interval = clampInterval(Math.max(1, prev * ease));
      return {
        ...base,
        easeFactor: ease,
        intervalDays: interval,
        repetitions: state.repetitions + 1,
        dueAt: addDays(now, interval),
      };
    }
    case "EASY": {
      const ease = clampEase(state.easeFactor + EASE_DELTA_EASY);
      const interval = clampInterval(Math.max(1, prev * ease * EASY_BONUS));
      return {
        ...base,
        easeFactor: ease,
        intervalDays: interval,
        repetitions: state.repetitions + 1,
        dueAt: addDays(now, interval),
      };
    }
  }
}
