import { describe, it, expect } from "vitest";
import { buildQueue, dueCount, priority, type QueueCard } from "@/core/srs/queue";

const NOW = new Date("2026-06-13T10:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY_MS);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * DAY_MS);

const card = (over: Partial<QueueCard> & { id: string }): QueueCard => ({
  dueAt: null,
  masteryScore: 50,
  status: "ACTIVE",
  ...over,
});

// A: overdue 10d, strong (not weak)         -> priority 10
// B: overdue 2d, mastery 20 (weak)          -> priority 32
// C: new, mastery 0 (weak)                  -> priority 30.5
// E: overdue 1d, strong                     -> priority 1
// D: due tomorrow                           -> not due
// F: overdue but ARCHIVED                   -> excluded
// G: overdue but MASTERED                   -> excluded
const A = card({ id: "A", dueAt: daysAgo(10), masteryScore: 70 });
const B = card({ id: "B", dueAt: daysAgo(2), masteryScore: 20 });
const C = card({ id: "C", dueAt: null, masteryScore: 0 });
const E = card({ id: "E", dueAt: daysAgo(1), masteryScore: 90 });
const D = card({ id: "D", dueAt: daysAhead(1), masteryScore: 90 });
const F = card({ id: "F", dueAt: daysAgo(5), masteryScore: 10, status: "ARCHIVED" });
const G = card({ id: "G", dueAt: daysAgo(5), masteryScore: 95, status: "MASTERED" });

const ALL = [A, B, C, E, D, F, G];

describe("priority", () => {
  it("overdue, not weak → overdue days", () => {
    expect(priority(A, NOW)).toBeCloseTo(10, 6);
  });
  it("overdue + weak → overdue days + weak boost", () => {
    expect(priority(B, NOW)).toBeCloseTo(32, 6);
  });
  it("new + weak → fixed new priority + weak boost", () => {
    expect(priority(C, NOW)).toBeCloseTo(30.5, 6);
  });
  it("new, not weak → just the fixed new priority", () => {
    expect(priority(card({ id: "x", dueAt: null, masteryScore: 60 }), NOW)).toBeCloseTo(0.5, 6);
  });
});

describe("dueCount", () => {
  it("counts active, due-or-new cards only", () => {
    expect(dueCount(ALL, NOW)).toBe(4); // A, B, C, E
  });
  it("treats a card due exactly now as due", () => {
    expect(dueCount([card({ id: "now", dueAt: NOW })], NOW)).toBe(1);
  });
});

describe("buildQueue", () => {
  it("orders by priority (weak/overdue first) and drops not-due/archived/mastered", () => {
    const q = buildQueue(ALL, NOW);
    expect(q.map((c) => c.id)).toEqual(["B", "C", "A", "E"]);
  });

  it("caps new cards at newCardsPerDay while keeping due reviews", () => {
    const cards = [
      card({ id: "N1", dueAt: null, masteryScore: 0 }),
      card({ id: "N2", dueAt: null, masteryScore: 0 }),
      card({ id: "N3", dueAt: null, masteryScore: 0 }),
      card({ id: "R", dueAt: daysAgo(1), masteryScore: 90 }),
    ];
    const q = buildQueue(cards, NOW, { newCardsPerDay: 2, dailyLimit: 10 });
    expect(q.map((c) => c.id)).toEqual(["N1", "N2", "R"]);
  });

  it("caps the total queue at dailyLimit", () => {
    const q = buildQueue(ALL, NOW, { dailyLimit: 2 });
    expect(q.map((c) => c.id)).toEqual(["B", "C"]);
  });
});
