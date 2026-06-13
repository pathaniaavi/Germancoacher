import { describe, it, expect } from "vitest";
import {
  dimensionScore,
  isDimensionStrong,
  computeWordScores,
} from "@/core/srs/mastery";
import { initialSrsState, GRADUATED_STEP, DEFAULT_EASE } from "@/core/srs/scheduler";
import type { SrsState } from "@/core/srs/types";

function review(overrides: Partial<SrsState> = {}): SrsState {
  return {
    easeFactor: DEFAULT_EASE,
    intervalDays: 25,
    repetitions: 4,
    lapses: 0,
    learningStep: GRADUATED_STEP,
    dueAt: new Date("2026-07-01T00:00:00.000Z"),
    lastReviewedAt: new Date("2026-06-13T00:00:00.000Z"),
    ...overrides,
  };
}

/** A maxed-out dimension (saturates every component → 100). */
const STRONG_100: SrsState = review({ intervalDays: 500, repetitions: 20, easeFactor: 3.0 });
/** Strong enough to count toward mastery (interval >= 21, score >= 80). */
const STRONG: SrsState = review({ intervalDays: 30, repetitions: 8, easeFactor: 2.7 });

describe("dimensionScore", () => {
  it("scores a never-reviewed dimension 0", () => {
    expect(dimensionScore(initialSrsState())).toBe(0);
  });

  it("scores a saturated dimension 100", () => {
    expect(dimensionScore(STRONG_100)).toBe(100);
  });

  it("is monotonic in interval", () => {
    const lo = dimensionScore(review({ intervalDays: 5 }));
    const hi = dimensionScore(review({ intervalDays: 50 }));
    expect(hi).toBeGreaterThan(lo);
  });

  it("penalizes lapses", () => {
    const clean = dimensionScore(review({ lapses: 0 }));
    const lapsed = dimensionScore(review({ lapses: 2 }));
    expect(clean - lapsed).toBe(12); // MASTERY_LAPSE_PENALTY * 2
  });

  it("never goes below 0 even with many lapses", () => {
    expect(dimensionScore(review({ lapses: 50 }))).toBe(0);
  });
});

describe("isDimensionStrong", () => {
  it("is false for a mid-strength card", () => {
    expect(isDimensionStrong(review({ intervalDays: 25 }))).toBe(false);
  });

  it("is true for a long-interval, high-score card", () => {
    expect(isDimensionStrong(STRONG)).toBe(true);
  });

  it("is false when the interval is short even if the score is high", () => {
    expect(isDimensionStrong(review({ intervalDays: 10, repetitions: 20, easeFactor: 3 }))).toBe(
      false,
    );
  });
});

describe("computeWordScores", () => {
  it("a fresh word: zero scores, active, weak", () => {
    const s = computeWordScores(initialSrsState(), initialSrsState());
    expect(s).toMatchObject({
      recognitionScore: 0,
      productionScore: 0,
      masteryScore: 0,
      status: "ACTIVE",
      weak: true,
    });
  });

  it("weights production higher than recognition (the product thesis)", () => {
    const recOnly = computeWordScores(STRONG_100, initialSrsState());
    const prodOnly = computeWordScores(initialSrsState(), STRONG_100);
    expect(recOnly.masteryScore).toBe(45); // round(0.45 * 100)
    expect(prodOnly.masteryScore).toBe(55); // round(0.55 * 100)
    expect(prodOnly.masteryScore).toBeGreaterThan(recOnly.masteryScore);
  });

  it("recognition-only is not mastered and stays weak", () => {
    const s = computeWordScores(STRONG, initialSrsState());
    expect(s.status).toBe("ACTIVE");
    expect(s.weak).toBe(true); // mastery dragged below 40 by zero production
  });

  it("both sides strong → MASTERED", () => {
    const s = computeWordScores(STRONG, STRONG);
    expect(s.status).toBe("MASTERED");
    expect(s.weak).toBe(false);
  });

  it("archived overrides status", () => {
    const s = computeWordScores(STRONG, STRONG, { archived: true });
    expect(s.status).toBe("ARCHIVED");
  });

  it("a recent lapse forces the weak flag", () => {
    const s = computeWordScores(STRONG, STRONG, { recentLapse: true });
    expect(s.weak).toBe(true);
  });
});
