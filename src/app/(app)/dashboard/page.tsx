"use client";

import Link from "next/link";
import { apiGet } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { StatsSummary } from "@/lib/dto";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "var(--space-4)",
};

export default function DashboardPage() {
  const { status, data, error, reload } = useFetch<StatsSummary>(() => apiGet("/api/stats/summary"));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your learning at a glance." />

      {status === "loading" && (
        <div style={grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton width={80} height={12} />
              <div style={{ marginTop: 8 }}>
                <Skeleton width={48} height={28} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {status === "error" && (
        <Card>
          <p style={{ color: "var(--danger)", marginBottom: "var(--space-3)" }}>
            Couldn’t load your stats: {error}
          </p>
          <Button variant="secondary" size="sm" onClick={reload}>
            Try again
          </Button>
        </Card>
      )}

      {status === "success" && data && data.total === 0 && (
        <EmptyState
          title="No words yet"
          description="Add your first German word to start building your deck. The coach tracks both whether you recognize a word and whether you can actually use it."
          action={
            <Link href="/words/new">
              <Button>Add your first word</Button>
            </Link>
          }
        />
      )}

      {status === "success" && data && data.total > 0 && (
        <>
          <section
            className="reveal"
            style={{
              background: "var(--accent-grad)",
              color: "var(--on-accent)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-6)",
              marginBottom: "var(--space-5)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-4)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div>
              <div style={{ fontSize: "var(--fs-sm)", opacity: 0.85, fontWeight: 600 }}>
                {data.dueToday > 0 ? "Due for review today" : "You’re all caught up"}
              </div>
              <div
                className="headword"
                style={{ fontSize: "3rem", fontWeight: 600, lineHeight: 1, marginTop: 4 }}
              >
                {data.dueToday}
                <span style={{ fontSize: "var(--fs-md)", opacity: 0.8, marginLeft: 8 }}>
                  {data.dueToday === 1 ? "word" : "words"}
                </span>
              </div>
              {data.streak > 0 ? (
                <div style={{ marginTop: 8, fontSize: "var(--fs-sm)", opacity: 0.9 }}>
                  🔥 {data.streak}-day streak
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Link href="/review">
                <Button variant="secondary" size="lg">
                  {data.dueToday > 0 ? "Start review" : "Review anyway"}
                </Button>
              </Link>
            </div>
          </section>

          <div style={grid}>
            {[
              { label: "Total words", value: data.total, tone: "neutral" as const },
              { label: "Due today", value: data.dueToday, tone: "accent" as const },
              { label: "Reviewed today", value: data.reviewedToday, tone: "success" as const },
              { label: "Mastered", value: data.mastered, tone: "success" as const },
              { label: "Weak words", value: data.weak, tone: "warning" as const },
              { label: "Streak", value: `${data.streak}d`, tone: "neutral" as const },
            ].map((s, i) => (
              <div key={s.label} className="reveal" style={{ animationDelay: `${i * 50}ms` }}>
                <StatCard label={s.label} value={s.value} tone={s.tone} />
              </div>
            ))}
          </div>

          <Card className="reveal" style={{ marginTop: "var(--space-5)", animationDelay: "320ms" }}>
            <p style={{ color: "var(--text-muted)" }}>
              Mastery needs both sides: you recognize a word <em>and</em> can use it in a sentence.
              Practising sentences is what moves words from “weak” to “mastered”.
            </p>
            <div style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-2)" }}>
              <Link href="/practice">
                <Button size="sm" variant="secondary">
                  Practice sentences
                </Button>
              </Link>
              <Link href="/words/new">
                <Button size="sm" variant="ghost">
                  Add a word
                </Button>
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
