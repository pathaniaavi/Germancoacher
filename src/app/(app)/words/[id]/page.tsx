"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { WordDTO } from "@/lib/dto";
import type { MeaningExplanation, SentenceSuggestion, UsageExplanation } from "@/core/ai/schemas";
import { articleColorVar, ARTICLE_LABEL, formatDue, masteryLabel, POS_LABEL } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { PronounceButton } from "@/components/audio/PronounceButton";

interface ExplainResponse {
  source: string;
  meaning: MeaningExplanation;
  usage: UsageExplanation;
}
interface SuggestResponse {
  source: string;
  suggestions: SentenceSuggestion;
}

export default function WordDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { status, data, error, reload } = useFetch<WordDTO>(() => apiGet(`/api/words/${id}`), [id]);

  const [explain, setExplain] = useState<ExplainResponse | null>(null);
  const [suggest, setSuggest] = useState<SuggestResponse | null>(null);
  const [aiBusy, setAiBusy] = useState<"explain" | "suggest" | null>(null);

  async function runExplain() {
    setAiBusy("explain");
    try {
      setExplain(await apiPost<ExplainResponse>("/api/ai/explain", { wordId: id }));
    } finally {
      setAiBusy(null);
    }
  }
  async function runSuggest() {
    setAiBusy("suggest");
    try {
      setSuggest(await apiPost<SuggestResponse>("/api/ai/suggest", { wordId: id }));
    } finally {
      setAiBusy(null);
    }
  }
  async function archive(word: WordDTO) {
    await apiPost(`/api/words/${id}/archive`, { archived: word.status !== "ARCHIVED" });
    reload();
  }
  async function remove() {
    if (!window.confirm("Delete this word permanently?")) return;
    await apiDelete(`/api/words/${id}`);
    router.push("/words");
  }

  if (status === "loading")
    return (
      <Card>
        <Skeleton width={200} height={28} />
      </Card>
    );
  if (status === "error" || !data)
    return (
      <Card>
        <p style={{ color: "var(--danger)", marginBottom: "var(--space-3)" }}>{error ?? "Not found"}</p>
        <Button variant="secondary" size="sm" onClick={() => router.push("/words")}>
          Back to words
        </Button>
      </Card>
    );

  const w = data;

  return (
    <div style={{ maxWidth: "var(--maxw-reading)", margin: "0 auto" }}>
      <PageHeader
        title={
          (w.article !== "NONE" ? `${ARTICLE_LABEL[w.article]} ` : "") + w.word
        }
        subtitle={w.translation}
        actions={
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <PronounceButton
              text={(w.article !== "NONE" ? `${ARTICLE_LABEL[w.article]} ` : "") + w.word}
              variant="secondary"
            />
            <Badge tone={w.status === "MASTERED" ? "success" : w.status === "ARCHIVED" ? "neutral" : "accent"}>
              {w.status.toLowerCase()}
            </Badge>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <ScoreCard label="Recognition" value={w.recognitionScore} hint="Knows the meaning" />
        <ScoreCard label="Production" value={w.productionScore} hint="Can use it in a sentence" />
        <ScoreCard label="Mastery" value={w.masteryScore} hint={masteryLabel(w.masteryScore)} />
      </div>

      <Card style={{ marginBottom: "var(--space-4)" }}>
        <CardTitle>Grammar & details</CardTitle>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0 }}>
          <Row k="Article" v={w.article === "NONE" ? "—" : <span style={{ color: articleColorVar(w.article) }}>{ARTICLE_LABEL[w.article]}</span>} />
          <Row k="Plural" v={w.plural ?? "—"} />
          <Row k="Part of speech" v={POS_LABEL[w.partOfSpeech]} />
          <Row k="Pronunciation" v={w.pronunciationHint ?? "—"} />
          <Row k="Level" v={w.level} />
          <Row k="Tags" v={w.tags.length ? w.tags.join(", ") : "—"} />
          <Row k="Next review" v={formatDue(w.recognitionDueAt)} />
        </dl>
        {w.notes ? (
          <p style={{ marginTop: "var(--space-3)", color: "var(--text-muted)" }}>“{w.notes}”</p>
        ) : null}
      </Card>

      <Card style={{ marginBottom: "var(--space-4)" }}>
        <CardTitle>AI helpers</CardTitle>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
          <Button size="sm" variant="secondary" onClick={runExplain} disabled={aiBusy !== null}>
            {aiBusy === "explain" ? "Explaining…" : "Explain meaning & usage"}
          </Button>
          <Button size="sm" variant="secondary" onClick={runSuggest} disabled={aiBusy !== null}>
            {aiBusy === "suggest" ? "Generating…" : "Suggest sentences"}
          </Button>
        </div>
        {explain ? (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <p>{explain.meaning.simpleEnglish}</p>
            <p style={{ color: "var(--text-muted)", marginTop: 4 }}>{explain.usage.usage}</p>
          </div>
        ) : null}
        {suggest ? (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--text)", display: "flex", flexDirection: "column", gap: 4 }}>
            <li>{suggest.suggestions.simple.de} <span style={{ color: "var(--text-faint)" }}>— {suggest.suggestions.simple.en}</span></li>
            <li>{suggest.suggestions.realLife.de} <span style={{ color: "var(--text-faint)" }}>— {suggest.suggestions.realLife.en}</span></li>
            <li><strong>Cloze:</strong> {suggest.suggestions.cloze.de}</li>
          </ul>
        ) : null}
      </Card>

      <Card>
        <CardTitle>Manage</CardTitle>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button size="sm" variant="secondary" onClick={() => archive(w)}>
            {w.status === "ARCHIVED" ? "Unarchive" : "Archive"}
          </Button>
          <Button size="sm" variant="danger" onClick={remove}>
            Delete
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ScoreCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-4)" }}>
      <ProgressRing value={value} size={52} />
      <div>
        <div style={{ fontWeight: 650 }}>{label}</div>
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{hint}</div>
      </div>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>{k}</dt>
      <dd style={{ margin: 0 }}>{v}</dd>
    </>
  );
}
