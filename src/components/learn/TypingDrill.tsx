"use client";

import { useMemo, useState } from "react";
import { apiPost } from "@/lib/api";
import type { WordDTO } from "@/lib/dto";
import { ARTICLE_LABEL, headword } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/form";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Fold umlauts/ß and case so "Apfel"/"apfel", "Tür"/"tuer" both match. */
function fold(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^(der|die|das)\s+/, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ");
}

export function TypingDrill({ words, onDone }: { words: WordDTO[]; onDone: () => void }) {
  const order = useMemo(() => shuffle(words), [words]);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const current = order[idx];

  if (idx >= order.length) {
    return (
      <Card style={{ textAlign: "center" }}>
        <h3 style={{ marginBottom: "var(--space-2)" }}>{score} / {order.length} correct</h3>
        <Button onClick={onDone}>Done</Button>
      </Card>
    );
  }

  async function check() {
    if (result || !value.trim()) return;
    const right = fold(value) === fold(current!.word);
    setResult(right ? "correct" : "wrong");
    if (right) setScore((s) => s + 1);
    try {
      await apiPost("/api/review/answer", {
        wordId: current!.id,
        dimension: "RECOGNITION",
        rating: right ? "GOOD" : "AGAIN",
        mode: "TYPING",
      });
    } catch {
      /* keep flowing */
    }
  }

  function next() {
    setResult(null);
    setValue("");
    setIdx((i) => i + 1);
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
        <span>Type the German word</span>
        <span>{idx + 1} / {order.length}</span>
      </div>
      <div style={{ fontSize: "var(--fs-xl)", fontWeight: 700 }}>{current!.translation}</div>
      <Input
        autoFocus
        placeholder="German…"
        value={value}
        disabled={result !== null}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (result ? next() : check());
        }}
        aria-label="German answer"
      />
      {result ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Badge tone={result === "correct" ? "success" : "danger"}>
            {result === "correct" ? "Correct" : "Not quite"}
          </Badge>
          <span className="headword" style={{ fontWeight: 600 }}>
            {current!.article !== "NONE" ? `${ARTICLE_LABEL[current!.article]} ` : ""}
            {current!.word}
          </span>
          <Button size="sm" style={{ marginLeft: "auto" }} onClick={next}>
            {idx + 1 >= order.length ? "Finish" : "Next"}
          </Button>
        </div>
      ) : (
        <Button onClick={check} disabled={!value.trim()}>
          Check
        </Button>
      )}
    </Card>
  );
}
