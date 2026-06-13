import styles from "./Badge.module.css";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export function Badge({
  tone = "neutral",
  children,
  style,
}: {
  tone?: Tone;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`} style={style}>
      {children}
    </span>
  );
}
