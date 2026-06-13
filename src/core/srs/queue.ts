/**
 * Review-queue construction. Pure functions over lightweight card descriptors.
 *
 * Ordering policy (from the spec): prioritize overdue and weak words.
 *   priority = overdueDays (+ WEAK_BOOST if weak); new cards get a small fixed priority.
 * Higher priority is reviewed first. New cards are capped per day; the whole queue is
 * capped at the daily limit.
 */

import { WEAK_SCORE } from "./mastery";
import type { WordStatus } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Weak cards get this many "days of overdue-ness" added so they float up. */
export const WEAK_BOOST = 30;
/** Priority a brand-new (never-scheduled) card gets — above fresh-due, below overdue. */
export const NEW_CARD_PRIORITY = 0.5;

export interface QueueCard {
  id: string;
  /** When this dimension is next due. `null` = brand-new (never scheduled). */
  dueAt: Date | null;
  masteryScore: number;
  status: WordStatus;
}

export interface QueueOptions {
  dailyLimit?: number;
  newCardsPerDay?: number;
}

const DEFAULTS: Required<QueueOptions> = { dailyLimit: 30, newCardsPerDay: 10 };

const isNew = (c: QueueCard): boolean => c.dueAt === null;

const isDue = (c: QueueCard, now: Date): boolean =>
  c.status === "ACTIVE" && (c.dueAt === null || c.dueAt.getTime() <= now.getTime());

const isWeak = (c: QueueCard): boolean => c.masteryScore < WEAK_SCORE;

/** Sort key: bigger is more urgent. */
export function priority(card: QueueCard, now: Date): number {
  const overdueDays = card.dueAt
    ? Math.max(0, (now.getTime() - card.dueAt.getTime()) / DAY_MS)
    : NEW_CARD_PRIORITY;
  return overdueDays + (isWeak(card) ? WEAK_BOOST : 0);
}

function byPriorityDesc(a: QueueCard, b: QueueCard, now: Date): number {
  const diff = priority(b, now) - priority(a, now);
  if (diff !== 0) return diff;
  // Tie-break: older due date first, then id for determinism.
  const aDue = a.dueAt?.getTime() ?? 0;
  const bDue = b.dueAt?.getTime() ?? 0;
  if (aDue !== bDue) return aDue - bDue;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** How many cards are due right now (new + overdue), ignoring limits. */
export function dueCount(cards: QueueCard[], now: Date): number {
  return cards.filter((c) => isDue(c, now)).length;
}

/**
 * Build an ordered review queue: new cards capped at `newCardsPerDay`, combined with
 * due review cards, sorted by priority, then capped at `dailyLimit`.
 */
export function buildQueue(
  cards: QueueCard[],
  now: Date,
  options: QueueOptions = {},
): QueueCard[] {
  const { dailyLimit, newCardsPerDay } = { ...DEFAULTS, ...options };

  const due = cards.filter((c) => isDue(c, now));
  const sorted = [...due].sort((a, b) => byPriorityDesc(a, b, now));

  // Cap new cards while preserving overall priority order.
  let newAllowance = newCardsPerDay;
  const limited: QueueCard[] = [];
  for (const card of sorted) {
    if (isNew(card)) {
      if (newAllowance <= 0) continue;
      newAllowance -= 1;
    }
    limited.push(card);
    if (limited.length >= dailyLimit) break;
  }
  return limited;
}
