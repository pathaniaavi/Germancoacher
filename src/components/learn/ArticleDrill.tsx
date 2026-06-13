"use client";

import { useMemo, useState } from "react";
import { apiPost } from "@/lib/api";
import type { WordDTO } from "@/lib/dto";
import { articleColorVar } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const ARTICLES = ["DER", "DIE", "DAS"] as const;

export function ArticleDrill({ words, onDone }: { words: WordDTO[]; onDone: () => void }) {
  const order = useMemo(
    () => shuffle(words.filter((w) => w.partOfSpeech === "NOUN" && w.article !== "NONE")),
    [words],
  );
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const current = order[idx];

  if (order.length === 0) {
    return (
      <EmptyState
        title="No nouns with articles here"
        description="This topic has no der/die/das nouns to drill. Try another mode."
      />
    );
  }

  if (idx >= order.length) {
    return (
      <Card style={{ textAlign: "center" }}>
        <h3 style={{ marginBottom: "var(--space-2)" }}>{score} / {order.length} correct</h3>
        <Button onClick={onDone}>Done</Button>
      </Card>
    );
  }

  const answered = picked !== null;

  async function choose(a: string) {
    if (answered) return;
    setPicked(a);
    const right = a === current!.article;
    if (right) setScore((s) => s + 1);
    try {
      await apiPost("/api/review/answer", {
        wordId: current!.id,
        dimension: "RECOGNITION",
        rating: right ? "GOOD" : "AGAIN",
        mode: "FLASHCARD",
      });
    } catch {
      /* keep flowing */
    }
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", textAlign: "center" }}>
      <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
        Which article? · {idx + 1} / {order.length}
      </div>
      <div className="headword" style={{ fontSize: "var(--fs-2xl)", fontWeight: 600 }}>
        {current!.word}
      </div>
      <div style={{ color: "var(--text-faint)", fontSize: "var(--fs-sm)", marginTop: "-8px" }}>
        {current!.translation}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
        {ARTICLES.map((a) => {
          const isAnswer = a === current!.article;
          const isPick = a === picked;
          const border = answered && isAnswer ? "var(--success)" : answered && isPick ? "var(--danger)" : "var(--border-strong)";
          return (
            <button
              key={a}
              disabled={answered}
              onClick={() => choose(a)}
              style={{
                padding: "14px",
                borderRadius: "var(--radius)",
                border: `2px solid ${border}`,
                background: "var(--surface)",
                color: articleColorVar(a),
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "var(--fs-lg)",
                cursor: answered ? "default" : "pointer",
              }}
            >
              {a.toLowerCase()}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Badge tone={picked === current!.article ? "success" : "danger"}>
            {picked === current!.article ? "Correct" : `It's ${current!.article.toLowerCase()}`}
          </Badge>
          <Button size="sm" style={{ marginLeft: "auto" }} onClick={() => { setPicked(null); setIdx((i) => i + 1); }}>
            {idx + 1 >= order.length ? "Finish" : "Next"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
