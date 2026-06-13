"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuickAddWord } from "@/components/words/QuickAddWord";
import { ManualWordForm } from "@/components/words/ManualWordForm";

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

export default function NewWordPage() {
  const [mode, setMode] = useState<"quick" | "manual">("quick");

  return (
    <div style={{ maxWidth: "var(--maxw-reading)", margin: "0 auto" }}>
      <PageHeader
        title="Add a word"
        subtitle={mode === "quick" ? "Type a German word — we’ll fill in the rest." : "Set every detail yourself."}
      />

      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        <button style={tab(mode === "quick")} onClick={() => setMode("quick")}>
          Quick add
        </button>
        <button style={tab(mode === "manual")} onClick={() => setMode("manual")}>
          Full details
        </button>
      </div>

      {mode === "quick" ? <QuickAddWord /> : <ManualWordForm />}
    </div>
  );
}
