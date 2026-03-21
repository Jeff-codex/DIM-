import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminPrimaryNav } from "@/components/admin-primary-nav";
import { ADMIN_PRODUCT_NAME } from "@/lib/admin-labels";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: ADMIN_PRODUCT_NAME,
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
      <div className={`container ${styles.container}`}>
        <div className={styles.layoutFrame}>
          <AdminPrimaryNav />
          <div className={styles.contentColumn}>{children}</div>
        </div>
      </div>
    </div>
  );
}
