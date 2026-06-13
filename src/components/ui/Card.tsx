import styles from "./Card.module.css";

export function Card({
  className,
  interactive,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  const cls = [styles.card, interactive ? styles.interactive : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return <div className={cls} {...rest} />;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className={styles.title}>{children}</h3>;
}
