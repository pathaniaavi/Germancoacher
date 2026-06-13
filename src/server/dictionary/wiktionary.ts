/**
 * Free German word enrichment from English Wiktionary (CC-BY-SA).
 *
 * Fetches the page wikitext and best-effort parses the German section for: the English
 * gloss (translation), gender → article, plural, part of speech, IPA, and an example.
 * Returns null when there's no German entry or no usable translation, so callers can
 * fall back to AI. Parsing is intentionally tolerant — Wiktimedia markup varies.
 */
import type { WordLookup } from "@/core/ai/schemas";

const USER_AGENT = "GermanVocabCoach/0.1 (personal learning app)";

const POS_MAP: Record<string, string> = {
  Noun: "NOUN",
  "Proper noun": "NOUN",
  Verb: "VERB",
  Adjective: "ADJECTIVE",
  Adverb: "ADVERB",
  Preposition: "PREPOSITION",
  Conjunction: "CONJUNCTION",
  Pronoun: "PRONOUN",
  Numeral: "NUMERAL",
  Interjection: "INTERJECTION",
  Article: "ARTICLE",
};

async function fetchWikitext(title: string, host: "en" | "de" = "en"): Promise<string | null> {
  const url =
    `https://${host}.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(title)}` +
    `&prop=wikitext&format=json&formatversion=2&redirects=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { parse?: { wikitext?: string } };
    return data.parse?.wikitext ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function germanSection(wikitext: string): string | null {
  const m = /(?:^|\n)==\s*German\s*==\n([\s\S]*?)(?=\n==[^=]|$)/.exec(wikitext);
  return m ? m[1]! : null;
}

/** Strip wiki markup from a definition/example fragment. */
function clean(s: string): string {
  return s
    .replace(/\{\{(?:lb|label|tlb|q|qualifier)\|[^}]*\}\}/gi, "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[;:,]\s*$/, "");
}

function parseGerman(section: string): WordLookup | null {
  // Part of speech: first recognized L3/L4 heading.
  let partOfSpeech: string | undefined;
  let posIndex = -1;
  const headingRe = /\n===+\s*([^=\n]+?)\s*===+/g;
  let h: RegExpExecArray | null;
  while ((h = headingRe.exec(section))) {
    const mapped = POS_MAP[h[1]!.trim()];
    if (mapped) {
      partOfSpeech = mapped;
      posIndex = h.index;
      break;
    }
  }

  // Translation: first 1-2 top-level gloss lines ("# ...", not "#:"/"#*").
  // Take the primary gloss only, so niche senses don't pollute the translation.
  const body = posIndex >= 0 ? section.slice(posIndex) : section;
  let translation = "";
  for (const line of body.split("\n")) {
    const g = /^#\s+(.*\S)/.exec(line);
    if (g) {
      const cleaned = clean(g[1]!);
      if (cleaned) {
        translation = cleaned;
        break;
      }
    }
  }
  if (!translation) return null;

  // Gender + plural from {{de-noun|...}} (best-effort).
  let article: string | undefined;
  let plural: string | undefined;
  const dn = /\{\{de-noun\|([^}]*)\}\}/.exec(section);
  if (dn) {
    const parts = dn[1]!.split("|").map((p) => p.trim());
    const positional = parts.filter((p) => p && !p.includes("="));
    const named: Record<string, string> = {};
    for (const p of parts.filter((x) => x.includes("="))) {
      const i = p.indexOf("=");
      named[p.slice(0, i).trim()] = p.slice(i + 1).trim();
    }
    const gender = positional.find((p) => /^(m|f|n)$/.test(p)) ?? named["g"] ?? named["1"];
    if (gender === "m") article = "DER";
    else if (gender === "f") article = "DIE";
    else if (gender === "n") article = "DAS";

    const pl = named["pl"] ?? named["plural"] ?? (positional.length >= 3 ? positional[2] : undefined);
    if (pl && pl !== "-" && pl !== "~" && pl !== "0") plural = pl;
  }

  const ipa = /\{\{IPA\|de\|([^}|]+)/.exec(section);
  const pronunciationHint = ipa ? ipa[1]!.trim() : undefined;

  const ux = /\{\{ux\|de\|([^|}]+)/.exec(section);
  const example = ux ? clean(ux[1]!) : undefined;

  return { translation, article, plural, partOfSpeech, pronunciationHint, example };
}

/**
 * German Wiktionary has clean `Genus=` / `Nominativ Plural=` fields — more reliable than
 * en.wiktionary's de-noun template for gender and plural. Used to backfill nouns.
 */
async function germanNounDetails(title: string): Promise<{ article?: string; plural?: string } | null> {
  const wt = await fetchWikitext(title, "de");
  if (!wt) return null;
  const out: { article?: string; plural?: string } = {};
  const genus = /\bGenus(?:\s*\d*)?\s*=\s*([mfn])\b/i.exec(wt);
  if (genus) {
    const g = genus[1]!.toLowerCase();
    out.article = g === "m" ? "DER" : g === "f" ? "DIE" : "DAS";
  }
  const pl = /Nominativ Plural(?:\s*\d*)?\s*=\s*([^\n|}]+)/i.exec(wt);
  if (pl) {
    const p = clean(pl[1]!);
    if (p && !/^[—\-–]$/.test(p)) out.plural = p;
  }
  return out;
}

/**
 * Prefix-search German headwords for autocomplete (Wiktionary OpenSearch).
 * Titles skew German on de.wiktionary; the final lookup filters to the German entry anyway.
 */
export async function suggestGerman(prefix: string, limit = 8): Promise<string[]> {
  const q = prefix.trim();
  if (q.length < 2) return [];
  const url =
    `https://de.wiktionary.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}` +
    `&limit=${limit}&namespace=0&format=json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    // OpenSearch shape: [term, titles[], descriptions[], urls[]]
    const data = (await res.json()) as [string, string[], string[], string[]];
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Look up a German word; returns enrichment or null if not found. */
export async function lookupGerman(word: string): Promise<WordLookup | null> {
  const base = word.trim();
  if (!base) return null;
  const capitalized = base.charAt(0).toUpperCase() + base.slice(1);
  const titles = capitalized === base ? [base] : [base, capitalized];

  for (const title of titles) {
    const wikitext = await fetchWikitext(title);
    if (!wikitext) continue;
    const section = germanSection(wikitext);
    if (!section) continue;
    const parsed = parseGerman(section);
    if (!parsed) continue;

    // Backfill gender/plural for nouns from German Wiktionary when missing.
    if (parsed.partOfSpeech === "NOUN" && (!parsed.plural || !parsed.article)) {
      const de = await germanNounDetails(title);
      if (de) {
        if (!parsed.article && de.article) parsed.article = de.article;
        if (!parsed.plural && de.plural) parsed.plural = de.plural;
      }
    }
    return parsed;
  }
  return null;
}
