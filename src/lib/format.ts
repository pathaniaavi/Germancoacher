/** Presentation helpers shared across screens. Pure, no React. */

export const ARTICLE_LABEL: Record<string, string> = {
  DER: "der",
  DIE: "die",
  DAS: "das",
  NONE: "",
};

/** CSS variable holding the mnemonic color for an article. */
export function articleColorVar(article: string): string {
  switch (article) {
    case "DER":
      return "var(--der)";
    case "DIE":
      return "var(--die)";
    case "DAS":
      return "var(--das)";
    default:
      return "var(--text-muted)";
  }
}

export const POS_LABEL: Record<string, string> = {
  NOUN: "noun",
  VERB: "verb",
  ADJECTIVE: "adjective",
  ADVERB: "adverb",
  PRONOUN: "pronoun",
  PREPOSITION: "preposition",
  CONJUNCTION: "conjunction",
  ARTICLE: "article",
  NUMERAL: "numeral",
  INTERJECTION: "interjection",
  PHRASE: "phrase",
  OTHER: "other",
};

/** "der Tisch" / "Tisch" — the headword as a learner should memorize it. */
export function headword(word: string, article: string): string {
  const a = ARTICLE_LABEL[article] ?? "";
  return a ? `${a} ${word}` : word;
}

/** Human-friendly relative due time. Negative = overdue. */
export function formatDue(dueAt: string | Date | null, now: Date = new Date()): string {
  if (!dueAt) return "New";
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const ms = due.getTime() - now.getTime();
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (ms <= 0) {
    if (days === 0) return "Due now";
    return `Overdue ${Math.abs(days)}d`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 30) return `Due in ${days}d`;
  const months = Math.round(days / 30);
  return `Due in ${months}mo`;
}

/** Compact interval label for rating previews: "<10m", "1d", "3mo". */
export function formatInterval(days: number): string {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export function masteryLabel(score: number): string {
  if (score >= 80) return "Mastered";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Learning";
  return "Weak";
}
