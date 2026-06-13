"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";

/**
 * Speaks German text via the browser's built-in SpeechSynthesis API.
 * No backend / key / network — uses the OS German voice (e.g. macOS "Anna").
 */
export function useGermanSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    if (!ok) return;
    // Voices load asynchronously in some browsers; warm them up.
    window.speechSynthesis.getVoices();
    const onChange = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", onChange);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", onChange);
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window) || !text.trim()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const voices = synth.getVoices();
    const german =
      voices.find((v) => v.lang === "de-DE") ??
      voices.find((v) => v.lang?.toLowerCase().startsWith("de"));
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    if (german) utterance.voice = german;
    utterance.rate = 0.92; // a touch slower for learners
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
  }, []);

  return { supported, speaking, speak };
}

interface PronounceButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  text: string;
  label?: string;
}

/** A labelled "Listen" button. Renders nothing where speech isn't supported. */
export function PronounceButton({
  text,
  label = "Listen",
  variant = "ghost",
  size = "sm",
  ...rest
}: PronounceButtonProps) {
  const { supported, speaking, speak } = useGermanSpeech();
  if (!supported) return null;
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={`Pronounce "${text}"`}
      onClick={(e) => {
        // Don't trigger parent links/flip handlers.
        e.preventDefault();
        e.stopPropagation();
        speak(text);
      }}
      {...rest}
    >
      <span aria-hidden>{speaking ? "🔊" : "🔈"}</span> {label}
    </Button>
  );
}
