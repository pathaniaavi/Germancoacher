import styles from "./Skeleton.module.css";

export function Skeleton({
  width = "100%",
  height = 16,
  radius = "var(--radius-sm)",
}: {
  width?: string | number;
  height?: string | number;
  radius?: string;
}) {
  return <span className={styles.skeleton} style={{ width, height, borderRadius: radius }} />;
}
