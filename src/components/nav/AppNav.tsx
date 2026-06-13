"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import styles from "./AppNav.module.css";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/learn", label: "Learn" },
  { href: "/words", label: "Words" },
  { href: "/review", label: "Review" },
  { href: "/practice", label: "Practice" },
  { href: "/stats", label: "Stats" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <header className={styles.bar}>
      <Link href="/dashboard" className={styles.brand}>
        <span className={styles.brandMark}>GVC</span>
        <span className={styles.brandName}>German Vocab Coach</span>
      </Link>

      <nav className={styles.links} aria-label="Primary">
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.link} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.actions}>
        <ThemeToggle />
        <Link href="/words/new">
          <Button size="sm">Add word</Button>
        </Link>
      </div>
    </header>
  );
}
