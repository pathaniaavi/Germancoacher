"use client";

import styles from "./FlashCard.module.css";

/** A 3D flip card. `flipped` shows the back; clicking the front flips it. */
export function FlashCard({
  front,
  back,
  flipped,
  onFlip,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <div className={styles.scene}>
      <div className={`${styles.card} ${flipped ? styles.flipped : ""}`}>
        <button
          type="button"
          className={`${styles.face} ${styles.front}`}
          onClick={onFlip}
          aria-hidden={flipped}
          tabIndex={flipped ? -1 : 0}
        >
          {front}
        </button>
        <div className={`${styles.face} ${styles.back}`} aria-hidden={!flipped}>
          {back}
        </div>
      </div>
    </div>
  );
}
