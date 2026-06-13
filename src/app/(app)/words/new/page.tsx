"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/api";
import type { WordDTO } from "@/lib/dto";
import { ARTICLES, LEVELS, PARTS_OF_SPEECH } from "@/lib/validation";
import { POS_LABEL } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "var(--space-4)",
};

export default function NewWordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      word: String(fd.get("word") ?? "").trim(),
      translation: String(fd.get("translation") ?? "").trim(),
      article: String(fd.get("article") ?? "NONE"),
      plural: String(fd.get("plural") ?? "").trim() || undefined,
      partOfSpeech: String(fd.get("partOfSpeech") ?? "OTHER"),
      level: String(fd.get("level") ?? "A1"),
      pronunciationHint: String(fd.get("pronunciationHint") ?? "").trim() || undefined,
      exampleSentence: String(fd.get("exampleSentence") ?? "").trim() || undefined,
      notes: String(fd.get("notes") ?? "").trim() || undefined,
      tags: String(fd.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (!payload.word || !payload.translation) {
      setError("Word and translation are required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost<WordDTO>("/api/words", payload);
      toast(`Added “${payload.word}”`, "success");
      router.push("/words");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save word.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "var(--maxw-reading)", margin: "0 auto" }}>
      <PageHeader title="Add a word" subtitle="Only the word and its meaning are required." />
      <Card>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={row}>
            <Field label="German word" htmlFor="word">
              <Input id="word" name="word" placeholder="Tisch" autoFocus required />
            </Field>
            <Field label="English meaning" htmlFor="translation">
              <Input id="translation" name="translation" placeholder="table" required />
            </Field>
          </div>

          <div style={row}>
            <Field label="Article" htmlFor="article">
              <Select id="article" name="article" defaultValue="NONE">
                {ARTICLES.map((a) => (
                  <option key={a} value={a}>
                    {a === "NONE" ? "— none —" : a.toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Plural" htmlFor="plural">
              <Input id="plural" name="plural" placeholder="Tische" />
            </Field>
            <Field label="Part of speech" htmlFor="partOfSpeech">
              <Select id="partOfSpeech" name="partOfSpeech" defaultValue="NOUN">
                {PARTS_OF_SPEECH.map((p) => (
                  <option key={p} value={p}>
                    {POS_LABEL[p]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Level" htmlFor="level">
              <Select id="level" name="level" defaultValue="A1">
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Example sentence" htmlFor="exampleSentence" hint="A sentence that shows the word in use.">
            <Textarea id="exampleSentence" name="exampleSentence" placeholder="Der Tisch ist aus Holz." />
          </Field>

          <div style={row}>
            <Field label="Pronunciation hint" htmlFor="pronunciationHint">
              <Input id="pronunciationHint" name="pronunciationHint" placeholder="[ˈtɪʃ]" />
            </Field>
            <Field label="Tags" htmlFor="tags" hint="Comma-separated">
              <Input id="tags" name="tags" placeholder="furniture, home" />
            </Field>
          </div>

          <Field label="Personal note" htmlFor="notes">
            <Textarea id="notes" name="notes" placeholder="Anything that helps you remember it." />
          </Field>

          {error ? (
            <p role="alert" style={{ color: "var(--danger)", fontSize: "var(--fs-sm)" }}>
              {error}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save word"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/words")}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
