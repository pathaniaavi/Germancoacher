"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function OnboardingPage() {
  return (
    <Card style={{ width: "100%", maxWidth: 440 }}>
      <h1 style={{ fontSize: "var(--fs-xl)", marginBottom: "var(--space-2)" }}>Welcome 👋</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
        German Vocab Coach helps you do two things with every word: recognize it (meaning, article,
        plural) and actually use it in a sentence. You only “master” a word when both are strong.
      </p>
      <ol style={{ color: "var(--text)", paddingLeft: "1.1rem", marginBottom: "var(--space-5)", display: "flex", flexDirection: "column", gap: 6 }}>
        <li>Add words you’ve learned.</li>
        <li>Review them with spaced repetition.</li>
        <li>Practice writing your own sentences.</li>
      </ol>
      <Link href="/words/new">
        <Button full>Add your first word</Button>
      </Link>
    </Card>
  );
}
