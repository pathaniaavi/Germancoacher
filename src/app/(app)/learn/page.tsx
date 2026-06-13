"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { GenerateTopicResult, LearnPath, TopicProgress } from "@/lib/dto";
import { LEVELS } from "@/lib/validation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Field, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";

function TopicCard({ u, recommended }: { u: TopicProgress; recommended: boolean }) {
  return (
    <Link href={`/learn/${encodeURIComponent(u.topic)}`} style={{ textDecoration: "none" }}>
      <Card
        interactive
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-4)",
          borderColor: recommended ? "var(--accent)" : undefined,
          borderWidth: recommended ? 2 : 1,
        }}
      >
        <ProgressRing value={u.percent} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650, color: "var(--text)" }}>{u.topic}</div>
          <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
            {u.wordCount === 0 ? "Not started" : `${u.learnedCount}/${u.wordCount} learned`}
          </div>
        </div>
        {u.learned ? <Badge tone="success">Done</Badge> : recommended ? <Badge tone="accent">Next</Badge> : null}
      </Card>
    </Link>
  );
}

export default function LearnPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { status, data, error, reload } = useFetch<LearnPath>(() => apiGet("/api/learn/path"));
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("A1");
  const [busy, setBusy] = useState(false);

  async function generateCustom() {
    if (!topic.trim()) return;
    setBusy(true);
    try {
      const res = await apiPost<GenerateTopicResult>("/api/topics/generate", {
        level,
        topic: topic.trim(),
        count: 12,
      });
      toast(`Added ${res.created} words to “${res.topic}”`, "success");
      router.push(`/learn/${encodeURIComponent(res.topic)}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not generate", "danger");
      setBusy(false);
    }
  }

  const levelsPresent = data ? [...new Set(data.units.map((u) => u.level))] : [];

  return (
    <div>
      <PageHeader title="Learn" subtitle="Grow your vocabulary topic by topic." />

      <Card style={{ marginBottom: "var(--space-5)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: "var(--space-3)", alignItems: "end" }}>
          <Field label="Level" htmlFor="lvl">
            <Select id="lvl" value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </Field>
          <Field label="Generate any topic" htmlFor="topic">
            <Input id="topic" placeholder="e.g. Animals, Weather, Office…" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </Field>
          <Button onClick={generateCustom} disabled={busy || !topic.trim()}>
            {busy ? "Generating…" : "Generate"}
          </Button>
        </div>
      </Card>

      {status === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><Skeleton height={32} /></Card>
          ))}
        </div>
      )}

      {status === "error" && (
        <Card>
          <p style={{ color: "var(--danger)", marginBottom: "var(--space-3)" }}>{error}</p>
          <Button size="sm" variant="secondary" onClick={reload}>Try again</Button>
        </Card>
      )}

      {status === "success" && data && (
        <>
          {levelsPresent.map((lvl) => (
            <section key={lvl} style={{ marginBottom: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--fs-md)", marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>
                Level {lvl}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-3)" }}>
                {data.units
                  .filter((u) => u.level === lvl)
                  .map((u) => (
                    <TopicCard key={u.topic} u={u} recommended={u.topic === data.recommended} />
                  ))}
              </div>
            </section>
          ))}

          {data.custom.length > 0 && (
            <section>
              <h2 style={{ fontSize: "var(--fs-md)", marginBottom: "var(--space-3)", color: "var(--text-muted)" }}>
                Your topics
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-3)" }}>
                {data.custom.map((u) => (
                  <TopicCard key={u.topic} u={u} recommended={false} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
