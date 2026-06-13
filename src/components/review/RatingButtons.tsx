"use client";

import type { Rating } from "@/core/srs";
import styles from "./RatingButtons.module.css";

const ORDER: { rating: Rating; label: string; key: string; cls: string }[] = [
  { rating: "AGAIN", label: "Again", key: "1", cls: "again" },
  { rating: "HARD", label: "Hard", key: "2", cls: "hard" },
  { rating: "GOOD", label: "Good", key: "3", cls: "good" },
  { rating: "EASY", label: "Easy", key: "4", cls: "easy" },
];

export function RatingButtons({
  onRate,
  predictions,
  disabled,
}: {
  onRate: (r: Rating) => void;
  /** Optional next-interval preview per rating, e.g. { GOOD: "3d" }. */
  predictions?: Partial<Record<Rating, string>>;
  disabled?: boolean;
}) {
  return (
    <div className={styles.row} role="group" aria-label="Rate your recall">
      {ORDER.map((b) => (
        <button
          key={b.rating}
          type="button"
          disabled={disabled}
          className={`${styles.btn} ${styles[b.cls]}`}
          onClick={() => onRate(b.rating)}
        >
          <span className={styles.key} aria-hidden>
            {b.key}
          </span>
          <span className={styles.label}>{b.label}</span>
          {predictions?.[b.rating] ? (
            <span className={styles.pred}>{predictions[b.rating]}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
