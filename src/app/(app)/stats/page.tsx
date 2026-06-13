"use client";

import { apiGet } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { StatsSummary } from "@/lib/dto";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface DayActivity {
  date: string;
  count: number;
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "var(--space-4)",
};

export default function StatsPage() {
  const summary = useFetch<StatsSummary>(() => apiGet("/api/stats/summary"));
  const weekly = useFetch<DayActivity[]>(() => apiGet("/api/stats/weekly"));
  const max = Math.max(1, ...((weekly.data ?? []).map((d) => d.count)));

  return (
    <div>
      <PageHeader title="Progress" subtitle="How your learning is trending." />

      {summary.status === "loading" ? (
        <div style={grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton width={60} height={24} />
            </Card>
          ))}
        </div>
      ) : summary.status === "success" && summary.data ? (
        <div style={grid}>
          <StatCard label="Total words" value={summary.data.total} />
          <StatCard label="Mastered" value={summary.data.mastered} tone="success" />
          <StatCard label="Weak words" value={summary.data.weak} tone="warning" />
          <StatCard label="Due today" value={summary.data.dueToday} tone="accent" />
          <StatCard label="Reviewed today" value={summary.data.reviewedToday} />
          <StatCard label="Streak" value={`${summary.data.streak}d`} />
        </div>
      ) : (
        <Card>
          <p style={{ color: "var(--danger)" }}>{summary.error}</p>
        </Card>
      )}

      <Card style={{ marginTop: "var(--space-5)" }}>
        <CardTitle>Reviews this week</CardTitle>
        {weekly.status === "success" && weekly.data ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-2)", height: 140, paddingTop: "var(--space-3)" }}>
            {weekly.data.map((d) => (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  title={`${d.count} reviews`}
                  style={{
                    width: "100%",
                    height: `${(d.count / max) * 100}%`,
                    minHeight: 4,
                    background: d.count ? "var(--accent)" : "var(--surface-2)",
                    borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                    transition: "height var(--transition)",
                  }}
                />
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Skeleton height={120} />
        )}
      </Card>
    </div>
  );
}
