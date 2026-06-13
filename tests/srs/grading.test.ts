import { describe, it, expect } from "vitest";
import { ratingFromGrade } from "@/core/srs/grading";

describe("ratingFromGrade", () => {
  it("maps an incorrect verdict to AGAIN regardless of score", () => {
    expect(ratingFromGrade({ isCorrect: false, score: 95 })).toBe("AGAIN");
  });

  it("maps a very low score to AGAIN", () => {
    expect(ratingFromGrade({ isCorrect: true, score: 40 })).toBe("AGAIN");
  });

  it("maps a rough-but-correct sentence to HARD", () => {
    expect(ratingFromGrade({ isCorrect: true, score: 50 })).toBe("HARD");
    expect(ratingFromGrade({ isCorrect: true, score: 69 })).toBe("HARD");
  });

  it("maps a solid sentence to GOOD", () => {
    expect(ratingFromGrade({ isCorrect: true, score: 70 })).toBe("GOOD");
    expect(ratingFromGrade({ isCorrect: true, score: 89 })).toBe("GOOD");
  });

  it("maps an excellent sentence to EASY", () => {
    expect(ratingFromGrade({ isCorrect: true, score: 90 })).toBe("EASY");
    expect(ratingFromGrade({ isCorrect: true, score: 100 })).toBe("EASY");
  });
});
