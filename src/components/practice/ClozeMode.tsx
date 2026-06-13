"use client";

import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";
import type { WordDTO } from "@/lib/dto";
import type { SentenceSuggestion } from "@/core/ai/schemas";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/form";

interface SuggestResponse {
  source: string;
  suggestions: SentenceSuggestion;
}

const norm = (s: string) => s.trim().toLowerCase();

export function ClozeMode({ words }: { words: WordDTO[] }) {
  const [idx, setIdx] = useState(0);
  const [cloze, setCloze] = useState<SentenceSuggestion["cloze"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [checked, setChecked] = useState(false);
  const current = words[idx];

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCloze(null);
    setGuess("");
    setChecked(false);
    apiPost<SuggestResponse>("/api/ai/suggest", { wordId: current.id })
      .then((res) => {
        if (!cancelled) setCloze(res.suggestions.cloze);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load exercise.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [current]);

  if (idx >= words.length)
    return <EmptyState title="All done" description="You’ve completed every fill-in-the-blank." />;

  const correct = checked && cloze ? norm(guess) === norm(cloze.answer) : false;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
        Fill in the blank ({current!.translation})
      </span>

      {loading ? (
        <Skeleton height={28} />
      ) : error ? (
        <p style={{ color: "var(--danger)" }}>{error}</p>
      ) : cloze ? (
        <>
          <p style={{ fontSize: "var(--fs-lg)" }}>{cloze.de}</p>
          <Input
            placeholder="Your answer…"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            disabled={checked}
            aria-label="Cloze answer"
          />
          {checked ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Badge tone={correct ? "success" : "danger"}>
                {correct ? "Correct" : `Answer: ${cloze.answer}`}
              </Badge>
              <p style={{ color: "var(--text-muted)" }}>{cloze.de.replace("____", cloze.answer)}</p>
              <Button
                onClick={() => {
                  setIdx((i) => i + 1);
                }}
              >
                Next
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => setChecked(true)} disabled={!guess.trim()}>
                Check
              </Button>
              <Button variant="ghost" onClick={() => setIdx((i) => i + 1)}>
                Skip
              </Button>
            </div>
          )}
        </>
      ) : null}
    </Card>
  );
}
