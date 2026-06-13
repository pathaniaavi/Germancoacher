"use client";

import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/Button";

/** Compact, label-first theme switch (no icon-only control). */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}
    >
      {resolved === "dark" ? "Light mode" : "Dark mode"}
    </Button>
  );
}
