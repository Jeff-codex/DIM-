import Link from "next/link";
import styles from "./cta-button.module.css";

type CTAButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
};

export function CTAButton({
  href,
  children,
  variant = "primary",
}: CTAButtonProps) {
  return (
    <Link
      href={href}
      className={`${styles.button} ${
        variant === "secondary" ? styles.secondary : styles.primary
      }`.trim()}
    >
      {children}
    </Link>
  );
}
