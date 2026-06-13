"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost, ApiRequestError } from "@/lib/api";
import type { WordDTO, WordPreview } from "@/lib/dto";
import { ARTICLES } from "@/lib/validation";
import { articleColorVar, ARTICLE_LABEL, headword, POS_LABEL } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";
import { PronounceButton } from "@/components/audio/PronounceButton";

export function QuickAddWord() {
  const { toast } = useToast();
  const wordRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Starts true because the input is autoFocused on mount (programmatic focus doesn't
  // fire onFocus, so we'd otherwise never show suggestions until a manual refocus).
  const [focused, setFocused] = useState(true);
  const [meaning, setMeaning] = useState("");
  const [needMeaning, setNeedMeaning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [preview, setPreview] = useState<WordPreview | null>(null);
  const [editTranslation, setEditTranslation] = useState("");
  const [editArticle, setEditArticle] = useState("NONE");
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<WordDTO[]>([]);

  // Debounced autocomplete — ignores stale/out-of-order responses.
  useEffect(() => {
    const q = query.trim();
    if (preview || q.length < 2) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const handle = setTimeout(() => {
      apiGet<string[]>(`/api/words/suggest?q=${encodeURIComponent(q)}`)
        .then((s) => active && setSuggestions(s))
        .catch(() => active && setSuggestions([]));
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query, preview]);

  async function lookup(word: string) {
    if (!word.trim() || inFlight.current) return;
    inFlight.current = true;
    setLooking(true);
    setSuggestions([]);
    try {
      const res = await apiPost<WordPreview>("/api/words/lookup", {
        word: word.trim(),
        translation: meaning.trim() || undefined,
      });
      setPreview(res);
      setEditTranslation(res.details.translation);
      setEditArticle(res.details.article);
      setNeedMeaning(false);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 422) {
        setNeedMeaning(true);
      } else {
        toast(err instanceof Error ? err.message : "Lookup failed", "danger");
      }
    } finally {
      inFlight.current = false;
      setLooking(false);
    }
  }

  function reset() {
    setQuery("");
    setMeaning("");
    setNeedMeaning(false);
    setPreview(null);
    setSuggestions([]);
    wordRef.current?.focus();
  }

  async function save() {
    if (!preview || saving) return;
    const d = preview.details;
    setSaving(true);
    try {
      const word = await apiPost<WordDTO>("/api/words", {
        word: d.word,
        translation: editTranslation.trim() || d.translation,
        article: editArticle,
        plural: d.plural ?? undefined,
        partOfSpeech: d.partOfSpeech,
        level: d.level,
        exampleSentence: d.example ?? undefined,
        pronunciationHint: d.pronunciationHint ?? undefined,
      });
      setAdded((a) => [word, ...a]);
      toast(`Saved ${headword(word.word, word.article)} — ${word.translation}`, "success");
      reset();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        toast(err.message, "neutral");
      } else {
        toast(err instanceof Error ? err.message : "Could not save", "danger");
      }
    } finally {
      setSaving(false);
    }
  }

  const showSuggestions = focused && !preview && suggestions.length > 0;

  return (
    <div>
      {!preview ? (
        <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", overflow: "visible" }}>
          <div style={{ position: "relative" }}>
            <Field label="German word" htmlFor="qa-word" hint="Start typing — pick a suggestion or press Enter.">
              <Input
                id="qa-word"
                ref={wordRef}
                autoFocus
                autoComplete="off"
                placeholder="e.g. Schmetterling"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocused(true);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 120)}
                onKeyDown={(e) => e.key === "Enter" && lookup(query)}
              />
            </Field>
            {showSuggestions ? (
              <ul
                style={{
                  listStyle: "none",
                  margin: "4px 0 0",
                  padding: 4,
                  position: "absolute",
                  zIndex: 20,
                  left: 0,
                  right: 0,
                  background: "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-md)",
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQuery(s);
                        lookup(s);
                      }}
                      className="headword"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        border: "none",
                        background: "transparent",
                        color: "var(--text)",
                        cursor: "pointer",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 600,
                      }}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {needMeaning ? (
            <Field
              label="What does it mean?"
              htmlFor="qa-meaning"
              hint="Not in the dictionary — add the meaning and we’ll save it."
            >
              <Input
                id="qa-meaning"
                autoFocus
                placeholder="English meaning"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookup(query)}
              />
            </Field>
          ) : null}

          <Button onClick={() => lookup(query)} disabled={looking || !query.trim()}>
            {looking ? "Looking up…" : "Look up"}
          </Button>

          <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>
            Details come from Wiktionary (free, no key). Words it can’t find use Claude when an API key
            is set in <Link href="/settings">Settings</Link>.
          </p>
        </Card>
      ) : (
        <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Badge tone={preview.source === "dictionary" ? "accent" : preview.source === "ai" ? "neutral" : "neutral"}>
              {preview.source === "dictionary" ? "From Wiktionary" : preview.source === "ai" ? "From Claude" : "Your meaning"}
            </Badge>
            <PronounceButton text={headword(preview.details.word, editArticle)} label="" />
            {preview.exists ? <Badge tone="warning">Already in your deck</Badge> : null}
          </div>

          <div className="headword" style={{ fontSize: "var(--fs-2xl)", fontWeight: 600 }}>
            {editArticle !== "NONE" ? (
              <span style={{ color: articleColorVar(editArticle) }}>{ARTICLE_LABEL[editArticle]} </span>
            ) : null}
            {preview.details.word}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "var(--space-3)" }}>
            <Field label="Meaning" htmlFor="pv-tr">
              <Input id="pv-tr" value={editTranslation} onChange={(e) => setEditTranslation(e.target.value)} />
            </Field>
            <Field label="Article" htmlFor="pv-art">
              <Select id="pv-art" value={editArticle} onChange={(e) => setEditArticle(e.target.value)}>
                {ARTICLES.map((a) => (
                  <option key={a} value={a}>{a === "NONE" ? "— none —" : a.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>

          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", margin: 0, fontSize: "var(--fs-sm)" }}>
            <dt style={{ color: "var(--text-muted)" }}>Plural</dt>
            <dd style={{ margin: 0 }}>{preview.details.plural ?? "—"}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Part of speech</dt>
            <dd style={{ margin: 0 }}>{POS_LABEL[preview.details.partOfSpeech] ?? preview.details.partOfSpeech}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Pronunciation</dt>
            <dd style={{ margin: 0 }}>{preview.details.pronunciationHint ?? "—"}</dd>
            {preview.details.example ? (
              <>
                <dt style={{ color: "var(--text-muted)" }}>Example</dt>
                <dd style={{ margin: 0 }}>{preview.details.example}</dd>
              </>
            ) : null}
          </dl>

          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button onClick={save} disabled={saving || !editTranslation.trim()}>
              {saving ? "Saving…" : "Save to my deck"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPreview(null);
                setNeedMeaning(false);
                setMeaning("");
              }}
            >
              Back
            </Button>
          </div>
        </Card>
      )}

      {added.length > 0 ? (
        <div style={{ marginTop: "var(--space-5)" }}>
          <h3 style={{ fontSize: "var(--fs-md)", marginBottom: "var(--space-2)" }}>Added just now ({added.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {added.map((w) => (
              <Card key={w.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)" }}>
                <PronounceButton text={headword(w.word, w.article)} label="" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="headword" style={{ fontWeight: 600 }}>
                    {w.article !== "NONE" ? <span style={{ color: articleColorVar(w.article) }}>{ARTICLE_LABEL[w.article]} </span> : null}
                    {w.word}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}> — {w.translation}</span>
                </div>
                <Link href={`/words/${w.id}`} style={{ fontSize: "var(--fs-sm)" }}>Edit</Link>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
