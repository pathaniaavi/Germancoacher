import { Card } from "@/components/ui/Card";
import styles from "./StatCard.module.css";

export function StatCard({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "accent" | "warning" | "success";
  sub?: string;
}) {
  return (
    <Card className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.value} ${styles[tone]}`}>{value}</span>
      {sub ? <span className={styles.sub}>{sub}</span> : null}
    </Card>
  );
}
