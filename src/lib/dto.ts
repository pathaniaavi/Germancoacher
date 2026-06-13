/** Wire shapes shared by the API and the client. Dates are ISO strings over the wire. */

export interface WordDTO {
  id: string;
  word: string;
  translation: string;
  article: string;
  plural: string | null;
  partOfSpeech: string;
  level: string;
  notes: string | null;
  pronunciationHint: string | null;
  status: "ACTIVE" | "ARCHIVED" | "MASTERED";
  recognitionScore: number;
  productionScore: number;
  masteryScore: number;
  recognitionDueAt: string | null;
  productionDueAt: string | null;
  recognitionIntervalDays: number;
  productionIntervalDays: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Recognition-side SRS state sent with each review card so the client can preview intervals. */
export interface ReviewSrsState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  learningStep: number;
}

export interface ReviewQueueItem extends WordDTO {
  srs: ReviewSrsState;
}

export interface StatsSummary {
  total: number;
  dueToday: number;
  reviewedToday: number;
  mastered: number;
  weak: number;
  streak: number;
}

export interface ReviewAnswerResult {
  word: WordDTO;
  nextDueAt: string | null;
  nextIntervalDays: number;
}

export interface PracticeResult {
  attemptId: string;
  rating: "AGAIN" | "HARD" | "GOOD" | "EASY";
  verdict: {
    isCorrect: boolean;
    score: number;
    grammarFeedback: string;
    vocabFeedback: string;
    naturalAlternative: string;
  };
  productionScore: number;
  masteryScore: number;
  nextDueAt: string | null;
}

export interface SettingsDTO {
  dailyReviewLimit: number;
  newCardsPerDay: number;
  theme: string;
  aiEnabled: boolean;
  aiModel: string;
  /** A usable key exists (the user's or the server env). */
  aiKeyConfigured: boolean;
  aiKeySource: "user" | "env" | "none";
  /** Last 4 chars of the user's saved key (never the full key). */
  aiKeyHint: string | null;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
