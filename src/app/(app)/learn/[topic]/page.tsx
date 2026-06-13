"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { GenerateTopicResult, WordDTO } from "@/lib/dto";
import { articleColorVar, ARTICLE_LABEL } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { McFlashcardDrill } from "@/components/learn/McFlashcardDrill";
import { TypingDrill } from "@/components/learn/TypingDrill";
import { ArticleDrill } from "@/components/learn/ArticleDrill";

type Mode = "mc" | "typing" | "article";
const MODES: { key: Mode; label: string; desc: string }[] = [
  { key: "mc", label: "Flashcards", desc: "Pick the correct German" },
  { key: "typing", label: "Type it", desc: "Write the German word" },
  { key: "article", label: "der / die / das", desc: "Choose the article" },
];

export default function TopicPage() {
  const params = useParams<{ topic: string }>();
  const topic = decodeURIComponent(params.topic);
  const { toast } = useToast();
  const { status, data, error, reload } = useFetch<WordDTO[]>(
    () => apiGet(`/api/words?topic=${encodeURIComponent(topic)}`),
    [topic],
  );
  const words = data ?? [];
  const [mode, setMode] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const level = words[0]?.level ?? "A1";
      const res = await apiPost<GenerateTopicResult>("/api/topics/generate", { level, topic, count: 12 });
      toast(res.created > 0 ? `Added ${res.created} words` : "No new words to add", res.created > 0 ? "success" : "neutral");
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not generate words", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: "var(--maxw-reading)", margin: "0 auto" }}>
      <PageHeader
        title={topic}
        subtitle={status === "success" ? `${words.length} word${words.length === 1 ? "" : "s"}` : "Topic"}
        actions={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button size="sm" variant="secondary" onClick={generate} disabled={busy}>
              {busy ? "Generating…" : words.length ? "Add more" : "Generate words"}
            </Button>
            <Link href="/learn">
              <Button size="sm" variant="ghost">All topics</Button>
            </Link>
          </div>
        }
      />

      {status === "loading" && <Card><Skeleton height={80} /></Card>}

      {status === "error" && (
        <Card>
          <p style={{ color: "var(--danger)", marginBottom: "var(--space-3)" }}>{error}</p>
          <Button size="sm" variant="secondary" onClick={reload}>Try again</Button>
        </Card>
      )}

      {status === "success" && words.length === 0 && (
        <EmptyState
          title="No words yet for this topic"
          description="Generate a starter pack to begin. With an Anthropic key you get a fresh set for any topic; offline packs exist for Food, Family, and Numbers."
          action={<Button onClick={generate} disabled={busy}>{busy ? "Generating…" : "Generate words"}</Button>}
        />
      )}

      {status === "success" && words.length > 0 && mode && (
        <>
          {mode === "mc" && <McFlashcardDrill words={words} onDone={() => { setMode(null); reload(); }} />}
          {mode === "typing" && <TypingDrill words={words} onDone={() => { setMode(null); reload(); }} />}
          {mode === "article" && <ArticleDrill words={words} onDone={() => { setMode(null); reload(); }} />}
        </>
      )}

      {status === "success" && words.length > 0 && !mode && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
            {MODES.map((m) => (
              <Card key={m.key} interactive onClick={() => setMode(m.key)} style={{ cursor: "pointer" }}>
                <div style={{ fontWeight: 650, fontSize: "var(--fs-md)" }}>{m.label}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", marginTop: 4 }}>{m.desc}</div>
              </Card>
            ))}
          </div>

          <h3 style={{ fontSize: "var(--fs-md)", marginBottom: "var(--space-2)" }}>Words in this topic</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            {words.map((w) => (
              <Link key={w.id} href={`/words/${w.id}`} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: "var(--radius-sm)", color: "var(--text)" }}>
                  <span className="headword" style={{ fontWeight: 600 }}>
                    {w.article !== "NONE" ? <span style={{ color: articleColorVar(w.article) }}>{ARTICLE_LABEL[w.article]} </span> : null}
                    {w.word}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>{w.translation}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
