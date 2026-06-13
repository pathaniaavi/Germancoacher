"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ReviewAnswerResult, ReviewQueueItem } from "@/lib/dto";
import { schedule, type Rating, type SrsState } from "@/core/srs";
import { articleColorVar, ARTICLE_LABEL, formatInterval } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { RatingButtons } from "@/components/review/RatingButtons";
import { FlashCard } from "@/components/review/FlashCard";

const RATINGS: Rating[] = ["AGAIN", "HARD", "GOOD", "EASY"];

export default function ReviewPage() {
  const { status, data, error, reload } = useFetch<ReviewQueueItem[]>(() =>
    apiGet("/api/review/queue?mode=FLASHCARD"),
  );
  const queue = data ?? [];
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tally, setTally] = useState({ AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 });
  const [answerError, setAnswerError] = useState<string | null>(null);
  const current = queue[idx];

  // Live next-interval preview per rating, computed with the pure scheduler.
  const predictions = useMemo(() => {
    if (!current) return undefined;
    const state: SrsState = { ...current.srs, dueAt: null, lastReviewedAt: null };
    const now = new Date();
    return Object.fromEntries(
      RATINGS.map((r) => [r, formatInterval(schedule(state, r, now).intervalDays)]),
    ) as Record<Rating, string>;
  }, [current]);

  const rate = useCallback(
    async (rating: Rating) => {
      if (!current || busy) return;
      setBusy(true);
      setAnswerError(null);
      try {
        await apiPost<ReviewAnswerResult>("/api/review/answer", {
          wordId: current.id,
          dimension: "RECOGNITION",
          rating,
          mode: "FLASHCARD",
        });
        setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
        setRevealed(false);
        setIdx((i) => i + 1);
      } catch (err) {
        setAnswerError(err instanceof Error ? err.message : "Could not save your answer.");
      } finally {
        setBusy(false);
      }
    },
    [current, busy],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if ((e.key === " " || e.key === "Enter") && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const map: Record<string, Rating> = { "1": "AGAIN", "2": "HARD", "3": "GOOD", "4": "EASY" };
        const r = map[e.key];
        if (r) {
          e.preventDefault();
          void rate(r);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, revealed, rate]);

  const done = status === "success" && idx >= queue.length;
  const answered = tally.AGAIN + tally.HARD + tally.GOOD + tally.EASY;
  const progress = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  return (
    <div style={{ maxWidth: "var(--maxw-reading)", margin: "0 auto" }}>
      <PageHeader
        title="Review"
        subtitle={
          status === "success" && queue.length > 0 && !done
            ? `${idx + 1} of ${queue.length} · Space flips · 1–4 to rate`
            : "Recognition review"
        }
      />

      {status === "success" && queue.length > 0 && !done && (
        <div
          aria-hidden
          style={{
            height: 4,
            borderRadius: 999,
            background: "var(--surface-2)",
            marginBottom: "var(--space-4)",
            overflow: "hidden",
          }}
        >
          <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent-grad)", transition: "width var(--transition)" }} />
        </div>
      )}

      {status === "loading" && (
        <Card style={{ minHeight: 240, display: "grid", placeItems: "center" }}>
          <Skeleton width={180} height={40} />
        </Card>
      )}

      {status === "error" && (
        <Card>
          <p style={{ color: "var(--danger)", marginBottom: "var(--space-3)" }}>{error}</p>
          <Button variant="secondary" size="sm" onClick={reload}>
            Try again
          </Button>
        </Card>
      )}

      {status === "success" && queue.length === 0 && (
        <EmptyState
          title="All caught up"
          description="No words are due right now. Add new words or practice using the ones you know."
          action={
            <Link href="/words/new">
              <Button>Add a word</Button>
            </Link>
          }
        />
      )}

      {status === "success" && queue.length > 0 && done && (
        <Card style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "var(--fs-lg)", marginBottom: "var(--space-3)" }}>Session complete</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Reviewed {answered} {answered === 1 ? "word" : "words"} — Again {tally.AGAIN} · Hard {tally.HARD} ·
            Good {tally.GOOD} · Easy {tally.EASY}
          </p>
          <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-2)", justifyContent: "center" }}>
            <Link href="/dashboard">
              <Button variant="secondary">Dashboard</Button>
            </Link>
            <Link href="/practice">
              <Button>Practice sentences</Button>
            </Link>
          </div>
        </Card>
      )}

      {status === "success" && current && !done && (
        <>
          <FlashCard
            flipped={revealed}
            onFlip={() => setRevealed(true)}
            front={
              <>
                <div className="headword" style={{ fontSize: "var(--fs-2xl)", fontWeight: 600 }}>
                  {current.article && current.article !== "NONE" ? (
                    <span style={{ color: articleColorVar(current.article) }}>{ARTICLE_LABEL[current.article]} </span>
                  ) : null}
                  {current.word}
                </div>
                <p style={{ color: "var(--text-faint)", fontSize: "var(--fs-sm)" }}>
                  What does it mean? What’s the plural? — tap or press Space
                </p>
              </>
            }
            back={
              <>
                <div style={{ fontSize: "var(--fs-xl)", color: "var(--text)" }}>{current.translation}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
                  {current.plural ? `Plural: ${current.plural}` : "No plural recorded"}
                </div>
              </>
            }
          />

          {answerError ? (
            <p role="alert" style={{ color: "var(--danger)", fontSize: "var(--fs-sm)", marginTop: "var(--space-3)" }}>
              {answerError}
            </p>
          ) : null}

          <div style={{ marginTop: "var(--space-4)" }}>
            {revealed ? (
              <RatingButtons onRate={rate} predictions={predictions} disabled={busy} />
            ) : (
              <Button full onClick={() => setRevealed(true)}>
                Show answer
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
