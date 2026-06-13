"use client";

import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";
import type { Quiz } from "@/core/ai/schemas";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

interface QuizResponse {
  source: string;
  quiz: Quiz;
}

const optionStyle = (state: "idle" | "correct" | "wrong" | "muted"): React.CSSProperties => ({
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: "var(--radius)",
  border: `1px solid ${state === "correct" ? "var(--success)" : state === "wrong" ? "var(--danger)" : "var(--border-strong)"}`,
  background:
    state === "correct" ? "var(--success-soft)" : state === "wrong" ? "var(--danger-soft)" : "var(--surface)",
  color: state === "muted" ? "var(--text-faint)" : "var(--text)",
  cursor: state === "idle" ? "pointer" : "default",
  width: "100%",
});

export function QuizMode() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  function load() {
    setLoading(true);
    setError(null);
    setQuiz(null);
    setIdx(0);
    setPicked(null);
    setScore(0);
    apiPost<QuizResponse>("/api/ai/quiz", { count: 5, filter: "all" })
      .then((res) => setQuiz(res.quiz))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not build a quiz."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) return <Card><Skeleton height={120} /></Card>;
  if (error)
    return (
      <Card>
        <p style={{ color: "var(--danger)", marginBottom: "var(--space-3)" }}>{error}</p>
        <Button variant="secondary" size="sm" onClick={load}>
          Try again
        </Button>
      </Card>
    );
  if (!quiz || quiz.questions.length === 0)
    return <EmptyState title="No quiz available" description="Add some words first." />;

  if (idx >= quiz.questions.length)
    return (
      <Card style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "var(--fs-lg)", marginBottom: "var(--space-2)" }}>
          {score} / {quiz.questions.length} correct
        </h2>
        <Button onClick={load}>New quiz</Button>
      </Card>
    );

  const q = quiz.questions[idx]!;
  const answered = picked !== null;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
        Question {idx + 1} of {quiz.questions.length}
      </span>
      <p style={{ fontSize: "var(--fs-lg)", fontWeight: 650 }}>{q.prompt}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {q.options.map((opt, i) => {
          let state: "idle" | "correct" | "wrong" | "muted" = "idle";
          if (answered) {
            if (i === q.answerIndex) state = "correct";
            else if (i === picked) state = "wrong";
            else state = "muted";
          }
          return (
            <button
              key={i}
              style={optionStyle(state)}
              disabled={answered}
              onClick={() => {
                setPicked(i);
                if (i === q.answerIndex) setScore((s) => s + 1);
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <Badge tone={picked === q.answerIndex ? "success" : "danger"}>
            {picked === q.answerIndex ? "Correct" : "Not quite"}
          </Badge>
          <p style={{ color: "var(--text-muted)" }}>{q.explanation}</p>
          <Button
            onClick={() => {
              setPicked(null);
              setIdx((i) => i + 1);
            }}
          >
            {idx + 1 >= quiz.questions.length ? "See results" : "Next question"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
