import type { Metadata } from "next";
import type { ReactNode } from "react";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "DIM Editorial Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={`container ${styles.container}`}>{children}</div>
    </div>
  );
}
