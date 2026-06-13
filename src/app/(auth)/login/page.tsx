"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/form";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await signIn("nodemailer", { email, redirect: false, callbackUrl: "/dashboard" });
      if (res?.error) setError("Could not send the sign-in link. Check the email and try again.");
      else setSent(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ width: "100%", maxWidth: 380 }}>
      <h1 style={{ fontSize: "var(--fs-xl)", marginBottom: 4 }}>German Vocab Coach</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)", fontSize: "var(--fs-sm)" }}>
        Sign in with your email — we’ll send you a magic link.
      </p>

      {sent ? (
        <div role="status">
          <p style={{ marginBottom: "var(--space-2)" }}>Check your inbox.</p>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
            We sent a sign-in link to <strong>{email}</strong>.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {error ? (
            <p role="alert" style={{ color: "var(--danger)", fontSize: "var(--fs-sm)" }}>
              {error}
            </p>
          ) : null}
          <Button type="submit" full disabled={busy || !email}>
            {busy ? "Sending…" : "Send magic link"}
          </Button>
        </form>
      )}
    </Card>
  );
}
