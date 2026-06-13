"use client";

import Link from "next/link";
import { useState } from "react";
import { apiGet } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { WordDTO } from "@/lib/dto";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { WriteOwnMode } from "@/components/practice/WriteOwnMode";
import { ClozeMode } from "@/components/practice/ClozeMode";
import { QuizMode } from "@/components/practice/QuizMode";

const MODES = [
  { key: "write", label: "Write your own" },
  { key: "cloze", label: "Fill the blank" },
  { key: "quiz", label: "Quiz" },
] as const;

type Mode = (typeof MODES)[number]["key"];

const tab = (active: boolean): React.CSSProperties => ({
  padding: "6px 14px",
  borderRadius: "var(--radius-pill)",
  border: `1px solid ${active ? "var(--accent)" : "var(--border-strong)"}`,
  background: active ? "var(--accent-soft)" : "var(--surface)",
  color: active ? "var(--accent)" : "var(--text-muted)",
  fontSize: "var(--fs-sm)",
  fontWeight: 600,
  cursor: "pointer",
});

export default function PracticePage() {
  const [mode, setMode] = useState<Mode>("write");
  const { status, data, error, reload } = useFetch<WordDTO[]>(() => apiGet("/api/words?filter=all"));
  const words = data ?? [];

  return (
    <div style={{ maxWidth: "var(--maxw-reading)", margin: "0 auto" }}>
      <PageHeader title="Practice" subtitle="Show you can actually use the word, not just recognize it." />

      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
        {MODES.map((m) => (
          <button key={m.key} style={tab(mode === m.key)} onClick={() => setMode(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "quiz" ? (
        <QuizMode />
      ) : status === "loading" ? (
        <Card>
          <Skeleton width={160} height={24} />
        </Card>
      ) : status === "error" ? (
        <Card>
          <p style={{ color: "var(--danger)", marginBottom: "var(--space-3)" }}>{error}</p>
          <Button variant="secondary" size="sm" onClick={reload}>
            Try again
          </Button>
        </Card>
      ) : words.length === 0 ? (
        <EmptyState
          title="Nothing to practice yet"
          description="Add some words first, then come back to practice using them."
          action={
            <Link href="/words/new">
              <Button>Add a word</Button>
            </Link>
          }
        />
      ) : mode === "write" ? (
        <WriteOwnMode words={words} />
      ) : (
        <ClozeMode words={words} />
      )}
    </div>
  );
}
