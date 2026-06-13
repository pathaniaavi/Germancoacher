"use client";

import Link from "next/link";
import { useState } from "react";
import { apiGet } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { WordDTO } from "@/lib/dto";
import { articleColorVar, ARTICLE_LABEL, formatDue, headword, POS_LABEL } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Input } from "@/components/ui/form";
import { PronounceButton } from "@/components/audio/PronounceButton";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "due", label: "Due" },
  { key: "weak", label: "Weak" },
  { key: "mastered", label: "Mastered" },
  { key: "archived", label: "Archived" },
] as const;

const chip = (active: boolean): React.CSSProperties => ({
  padding: "5px 12px",
  borderRadius: "var(--radius-pill)",
  border: `1px solid ${active ? "var(--accent)" : "var(--border-strong)"}`,
  background: active ? "var(--accent-soft)" : "var(--surface)",
  color: active ? "var(--accent)" : "var(--text-muted)",
  fontSize: "var(--fs-sm)",
  fontWeight: 600,
  cursor: "pointer",
});

export default function WordsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const params = new URLSearchParams({ filter, ...(q ? { q } : {}) });
  const { status, data, error, reload } = useFetch<WordDTO[]>(
    () => apiGet(`/api/words?${params.toString()}`),
    [filter, q],
  );

  return (
    <div>
      <PageHeader
        title="Words"
        subtitle="Your German vocabulary."
        actions={
          <Link href="/words/new">
            <Button>Add word</Button>
          </Link>
        }
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f.key} style={chip(filter === f.key)} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <Input
            placeholder="Search word or meaning…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search words"
          />
        </div>
      </div>

      {status === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <Skeleton width={160} height={18} />
            </Card>
          ))}
        </div>
      )}

      {status === "error" && (
        <Card>
          <p style={{ color: "var(--danger)", marginBottom: "var(--space-3)" }}>{error}</p>
          <Button variant="secondary" size="sm" onClick={reload}>
            Try again
          </Button>
        </Card>
      )}

      {status === "success" && data && data.length === 0 && (
        <EmptyState
          title={q || filter !== "all" ? "No matching words" : "No words yet"}
          description={
            q || filter !== "all"
              ? "Try a different filter or search term."
              : "Add a word to get started."
          }
          action={
            <Link href="/words/new">
              <Button>Add word</Button>
            </Link>
          }
        />
      )}

      {status === "success" && data && data.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {data.map((w) => (
            <Link key={w.id} href={`/words/${w.id}`} style={{ textDecoration: "none" }}>
              <Card interactive style={{ padding: "var(--space-3) var(--space-4)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                  <ProgressRing value={w.masteryScore} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="headword" style={{ fontWeight: 600, fontSize: "var(--fs-lg)", color: "var(--text)" }}>
                      {w.article && w.article !== "NONE" ? (
                        <span style={{ color: articleColorVar(w.article) }}>{ARTICLE_LABEL[w.article]} </span>
                      ) : null}
                      {w.word}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>{w.translation}</div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                    <PronounceButton text={headword(w.word, w.article)} label="" />
                    <Badge>{POS_LABEL[w.partOfSpeech]}</Badge>
                    <Badge tone="neutral">{w.level}</Badge>
                    <Badge tone={w.recognitionDueAt && new Date(w.recognitionDueAt) <= new Date() ? "warning" : "neutral"}>
                      {formatDue(w.recognitionDueAt)}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
