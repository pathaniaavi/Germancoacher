"use client";

import { useMemo, useState } from "react";
import { apiPost } from "@/lib/api";
import type { WordDTO } from "@/lib/dto";
import { headword } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const optionStyle = (state: "idle" | "correct" | "wrong" | "muted"): React.CSSProperties => ({
  textAlign: "center",
  padding: "12px",
  borderRadius: "var(--radius)",
  border: `1px solid ${state === "correct" ? "var(--success)" : state === "wrong" ? "var(--danger)" : "var(--border-strong)"}`,
  background: state === "correct" ? "var(--success-soft)" : state === "wrong" ? "var(--danger-soft)" : "var(--surface)",
  color: state === "muted" ? "var(--text-faint)" : "var(--text)",
  cursor: state === "idle" ? "pointer" : "default",
  fontWeight: 600,
  fontFamily: "var(--font-display)",
});

export function McFlashcardDrill({ words, onDone }: { words: WordDTO[]; onDone: () => void }) {
  const order = useMemo(() => shuffle(words), [words]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const current = order[idx];

  const options = useMemo(() => {
    if (!current) return [];
    const distractors = shuffle(words.filter((w) => w.id !== current.id))
      .slice(0, 3)
      .map((w) => headword(w.word, w.article));
    return shuffle([headword(current.word, current.article), ...distractors]);
  }, [current, words]);

  if (idx >= order.length) {
    return (
      <Card style={{ textAlign: "center" }}>
        <h3 style={{ marginBottom: "var(--space-2)" }}>{score} / {order.length} correct</h3>
        <Button onClick={onDone}>Done</Button>
      </Card>
    );
  }

  const correct = headword(current!.word, current!.article);
  const answered = picked !== null;

  async function choose(opt: string) {
    if (answered) return;
    setPicked(opt);
    const right = opt === correct;
    if (right) setScore((s) => s + 1);
    try {
      await apiPost("/api/review/answer", {
        wordId: current!.id,
        dimension: "RECOGNITION",
        rating: right ? "GOOD" : "AGAIN",
        mode: "FLASHCARD",
      });
    } catch {
      /* keep the drill flowing even if the save hiccups */
    }
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
        <span>What is the German for…</span>
        <span>{idx + 1} / {order.length}</span>
      </div>
      <div style={{ fontSize: "var(--fs-xl)", fontWeight: 700 }}>{current!.translation}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        {options.map((opt) => {
          let state: "idle" | "correct" | "wrong" | "muted" = "idle";
          if (answered) state = opt === correct ? "correct" : opt === picked ? "wrong" : "muted";
          return (
            <button key={opt} style={optionStyle(state)} disabled={answered} onClick={() => choose(opt)}>
              {opt}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Badge tone={picked === correct ? "success" : "danger"}>
            {picked === correct ? "Correct" : `Answer: ${correct}`}
          </Badge>
          <Button size="sm" style={{ marginLeft: "auto" }} onClick={() => { setPicked(null); setIdx((i) => i + 1); }}>
            {idx + 1 >= order.length ? "Finish" : "Next"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
