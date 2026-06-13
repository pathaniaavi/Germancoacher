"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import type { PracticeResult, WordDTO } from "@/lib/dto";
import { headword } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Textarea } from "@/components/ui/form";

export function WriteOwnMode({ words }: { words: WordDTO[] }) {
  const [idx, setIdx] = useState(0);
  const [sentence, setSentence] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = words[idx];

  async function submit() {
    if (!current || !sentence.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setResult(
        await apiPost<PracticeResult>("/api/practice/attempt", {
          wordId: current.id,
          mode: "WRITE_OWN",
          userSentence: sentence.trim(),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check your sentence.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setResult(null);
    setSentence("");
    setIdx((i) => i + 1);
  }

  if (idx >= words.length)
    return <EmptyState title="Nice work" description="You’ve practiced every word in this set." />;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>Use this word in a sentence:</span>
        <div style={{ fontSize: "var(--fs-xl)", fontWeight: 700 }}>{headword(current!.word, current!.article)}</div>
        <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>{current!.translation}</span>
      </div>

      <Field label="Your sentence" htmlFor="sentence">
        <Textarea
          id="sentence"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder={`Write a German sentence using "${current!.word}"…`}
          disabled={busy || !!result}
        />
      </Field>

      {error ? (
        <p role="alert" style={{ color: "var(--danger)", fontSize: "var(--fs-sm)" }}>
          {error}
        </p>
      ) : null}

      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Badge tone={result.verdict.isCorrect ? "success" : "warning"}>
              {result.verdict.isCorrect ? "Looks good" : "Needs work"} · {result.verdict.score}/100
            </Badge>
            <Badge tone="accent">Production {result.productionScore} · Mastery {result.masteryScore}</Badge>
          </div>
          <Line label="Grammar" text={result.verdict.grammarFeedback} />
          <Line label="Vocabulary" text={result.verdict.vocabFeedback} />
          <Line label="More natural" text={result.verdict.naturalAlternative} />
          <Button onClick={next}>Next word</Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button onClick={submit} disabled={busy || !sentence.trim()}>
            {busy ? "Checking…" : "Check my sentence"}
          </Button>
          <Button variant="ghost" onClick={next}>
            Skip
          </Button>
        </div>
      )}
    </Card>
  );
}

function Line({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: "var(--fs-base)" }}>{text}</div>
    </div>
  );
}
