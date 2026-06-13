"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { SettingsDTO } from "@/lib/dto";
import { AI_MODELS } from "@/lib/validation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Field, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";
import { useTheme, type ThemePref } from "@/components/theme/ThemeProvider";

const THEMES: { key: ThemePref; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

export default function SettingsPage() {
  const { pref, setPref } = useTheme();
  const { toast } = useToast();
  const { status, data, error, reload } = useFetch<SettingsDTO>(() => apiGet("/api/settings"));

  const [model, setModel] = useState("claude-opus-4-8");
  const [keyInput, setKeyInput] = useState("");
  const [limit, setLimit] = useState(30);
  const [newPerDay, setNewPerDay] = useState(10);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setModel(data.aiModel);
      setLimit(data.dailyReviewLimit);
      setNewPerDay(data.newCardsPerDay);
    }
  }, [data]);

  async function patch(body: Record<string, unknown>, label: string, ok: string) {
    setSaving(label);
    try {
      await apiPatch<SettingsDTO>("/api/settings", body);
      toast(ok, "success");
      reload();
      if (label === "key") setKeyInput("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "danger");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div style={{ maxWidth: "var(--maxw-reading)", margin: "0 auto" }}>
      <PageHeader title="Settings" />

      <Card className="reveal" style={{ marginBottom: "var(--space-4)" }}>
        <CardTitle>AI (Anthropic Claude)</CardTitle>
        {status === "loading" ? (
          <Skeleton height={80} />
        ) : status === "error" ? (
          <p style={{ color: "var(--danger)" }}>{error}</p>
        ) : data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {data.aiKeySource === "user" ? (
                <Badge tone="success">Connected · your key {data.aiKeyHint}</Badge>
              ) : data.aiKeySource === "env" ? (
                <Badge tone="accent">Using server key</Badge>
              ) : (
                <Badge tone="warning">Not connected — using offline fallback</Badge>
              )}
            </div>

            <Field
              label="Anthropic API key"
              htmlFor="apiKey"
              hint="Stored on the server, never shown again. Paste a new key to replace it."
            >
              <Input
                id="apiKey"
                type="password"
                autoComplete="off"
                placeholder="sk-ant-…"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
              />
            </Field>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
              <Button
                size="sm"
                disabled={!keyInput.trim() || saving === "key"}
                onClick={() => patch({ anthropicApiKey: keyInput.trim() }, "key", "API key saved")}
              >
                {saving === "key" ? "Saving…" : "Save key"}
              </Button>
              {data.aiKeySource === "user" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => patch({ anthropicApiKey: "" }, "key", "API key removed")}
                >
                  Remove key
                </Button>
              ) : null}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "var(--fs-sm)", marginLeft: "auto" }}
              >
                Get a key ↗
              </a>
            </div>

            <Field label="Model" htmlFor="model">
              <Select
                id="model"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  patch({ aiModel: e.target.value }, "model", "Model updated");
                }}
              >
                {AI_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
      </Card>

      <Card className="reveal" style={{ marginBottom: "var(--space-4)", animationDelay: "60ms" }}>
        <CardTitle>Review</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <Field label="Daily review limit" htmlFor="limit">
            <Input id="limit" type="number" min={5} max={200} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
          </Field>
          <Field label="New cards / day" htmlFor="new">
            <Input id="new" type="number" min={0} max={100} value={newPerDay} onChange={(e) => setNewPerDay(Number(e.target.value))} />
          </Field>
        </div>
        <div style={{ marginTop: "var(--space-3)" }}>
          <Button
            size="sm"
            variant="secondary"
            disabled={saving === "review"}
            onClick={() => patch({ dailyReviewLimit: limit, newCardsPerDay: newPerDay }, "review", "Review settings saved")}
          >
            {saving === "review" ? "Saving…" : "Save"}
          </Button>
        </div>
      </Card>

      <Card className="reveal" style={{ animationDelay: "120ms" }}>
        <CardTitle>Appearance</CardTitle>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {THEMES.map((t) => (
            <Button key={t.key} size="sm" variant={pref === t.key ? "primary" : "secondary"} onClick={() => setPref(t.key)}>
              {t.label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
