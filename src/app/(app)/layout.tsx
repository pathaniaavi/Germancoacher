import { AppNav } from "@/components/nav/AppNav";
import { ToastProvider } from "@/components/ui/Toast";
import styles from "./layout.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppNav />
      <main className={styles.container}>{children}</main>
    </ToastProvider>
  );
}
