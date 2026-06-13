import { describe, it, expect } from "vitest";
import {
  schedule,
  initialSrsState,
  GRADUATED_STEP,
  GRADUATING_INTERVAL_DAYS,
  EASY_GRADUATING_INTERVAL_DAYS,
  LEARNING_STEPS_DAYS,
  MIN_EASE,
  MAX_INTERVAL_DAYS,
  DEFAULT_EASE,
} from "@/core/srs/scheduler";
import type { SrsState } from "@/core/srs/types";

const NOW = new Date("2026-06-13T10:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTES_10_MS = 10 * 60 * 1000;

/** A graduated (review-regime) state, with overrides. */
function review(overrides: Partial<SrsState> = {}): SrsState {
  return {
    easeFactor: DEFAULT_EASE,
    intervalDays: 10,
    repetitions: 3,
    lapses: 0,
    learningStep: GRADUATED_STEP,
    dueAt: new Date("2026-06-10T10:00:00.000Z"),
    lastReviewedAt: new Date("2026-06-03T10:00:00.000Z"),
    ...overrides,
  };
}

describe("initialSrsState", () => {
  it("is a fresh, never-scheduled learning card", () => {
    expect(initialSrsState()).toEqual({
      easeFactor: DEFAULT_EASE,
      intervalDays: 0,
      repetitions: 0,
      lapses: 0,
      learningStep: 0,
      dueAt: null,
      lastReviewedAt: null,
    });
  });
});

describe("learning regime", () => {
  it("GOOD advances a new card to the next learning step (1 day)", () => {
    const next = schedule(initialSrsState(), "GOOD", NOW);
    expect(next.learningStep).toBe(1);
    expect(next.intervalDays).toBeCloseTo(LEARNING_STEPS_DAYS[1]!, 10);
    expect(next.repetitions).toBe(0);
    expect(next.dueAt!.getTime()).toBe(NOW.getTime() + DAY_MS);
    expect(next.lastReviewedAt!.getTime()).toBe(NOW.getTime());
  });

  it("two GOODs graduate the card to the review regime", () => {
    const afterFirst = schedule(initialSrsState(), "GOOD", NOW);
    const graduated = schedule(afterFirst, "GOOD", NOW);
    expect(graduated.learningStep).toBe(GRADUATED_STEP);
    expect(graduated.intervalDays).toBe(GRADUATING_INTERVAL_DAYS);
    expect(graduated.repetitions).toBe(1);
  });

  it("EASY graduates immediately with the easy interval", () => {
    const next = schedule(initialSrsState(), "EASY", NOW);
    expect(next.learningStep).toBe(GRADUATED_STEP);
    expect(next.intervalDays).toBe(EASY_GRADUATING_INTERVAL_DAYS);
    expect(next.repetitions).toBe(1);
    expect(next.dueAt!.getTime()).toBe(NOW.getTime() + EASY_GRADUATING_INTERVAL_DAYS * DAY_MS);
  });

  it("AGAIN resets to the first step (10 minutes)", () => {
    const next = schedule(initialSrsState(), "AGAIN", NOW);
    expect(next.learningStep).toBe(0);
    expect(next.dueAt!.getTime()).toBe(NOW.getTime() + MINUTES_10_MS);
    expect(next.repetitions).toBe(0);
  });

  it("HARD repeats the current step", () => {
    const next = schedule(initialSrsState(), "HARD", NOW);
    expect(next.learningStep).toBe(0);
    expect(next.intervalDays).toBeCloseTo(LEARNING_STEPS_DAYS[0]!, 10);
  });

  it("does not change ease while learning", () => {
    expect(schedule(initialSrsState(), "GOOD", NOW).easeFactor).toBe(DEFAULT_EASE);
    expect(schedule(initialSrsState(), "EASY", NOW).easeFactor).toBe(DEFAULT_EASE);
    expect(schedule(initialSrsState(), "AGAIN", NOW).easeFactor).toBe(DEFAULT_EASE);
  });
});

describe("review regime", () => {
  it("GOOD multiplies the interval by ease and keeps ease", () => {
    const next = schedule(review(), "GOOD", NOW);
    expect(next.easeFactor).toBe(2.5);
    expect(next.intervalDays).toBeCloseTo(25, 10); // 10 * 2.5
    expect(next.repetitions).toBe(4);
    expect(next.dueAt!.getTime()).toBe(NOW.getTime() + 25 * DAY_MS);
  });

  it("HARD lowers ease by 0.15 and uses the 1.2 multiplier", () => {
    const next = schedule(review(), "HARD", NOW);
    expect(next.easeFactor).toBeCloseTo(2.35, 10);
    expect(next.intervalDays).toBeCloseTo(12, 10); // 10 * 1.2
    expect(next.repetitions).toBe(4);
  });

  it("EASY raises ease by 0.15 and applies the easy bonus", () => {
    const next = schedule(review(), "EASY", NOW);
    expect(next.easeFactor).toBeCloseTo(2.65, 10);
    expect(next.intervalDays).toBeCloseTo(10 * 2.65 * 1.3, 6); // 34.45
    expect(next.repetitions).toBe(4);
  });

  it("AGAIN lapses: lowers ease, resets reps, increments lapses, returns to learning", () => {
    const next = schedule(review({ lapses: 1 }), "AGAIN", NOW);
    expect(next.easeFactor).toBeCloseTo(2.3, 10);
    expect(next.repetitions).toBe(0);
    expect(next.lapses).toBe(2);
    expect(next.learningStep).toBe(0);
    expect(next.dueAt!.getTime()).toBe(NOW.getTime() + MINUTES_10_MS);
  });

  it("floors ease at MIN_EASE", () => {
    expect(schedule(review({ easeFactor: 1.4 }), "HARD", NOW).easeFactor).toBe(MIN_EASE);
    expect(schedule(review({ easeFactor: 1.4 }), "AGAIN", NOW).easeFactor).toBe(MIN_EASE);
  });

  it("never schedules a review interval below 1 day", () => {
    expect(schedule(review({ intervalDays: 0.5 }), "HARD", NOW).intervalDays).toBe(1);
  });

  it("caps the interval at MAX_INTERVAL_DAYS", () => {
    const next = schedule(review({ intervalDays: 2000 }), "GOOD", NOW);
    expect(next.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });
});

describe("purity", () => {
  it("does not mutate the input state", () => {
    const state = review();
    const snapshot = structuredClone(state);
    schedule(state, "GOOD", NOW);
    expect(state).toEqual(snapshot);
  });
});
