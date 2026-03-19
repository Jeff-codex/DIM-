import type { ElementType, ReactNode } from "react";
import styles from "./editorial-heading.module.css";

type EditorialHeadingVariant =
  | "hero"
  | "section"
  | "card"
  | "detail"
  | "form";

type EditorialHeadingProps<T extends ElementType = "h2"> = {
  as?: T;
  variant: EditorialHeadingVariant;
  title?: string;
  lines?: readonly string[];
  className?: string;
};

export function EditorialHeading<T extends ElementType = "h2">({
  as,
  variant,
  title,
  lines,
  className,
}: EditorialHeadingProps<T>) {
  const Tag = (as ?? "h2") as ElementType;
  const manualLines = lines?.filter((line) => line.trim().length > 0) ?? [];
  const content: ReactNode =
    manualLines.length > 0 ? (
      <span className={styles.lines} aria-label={title ?? manualLines.join(" ")}>
        {manualLines.map((line) => (
          <span key={line} className={styles.line}>
            {line}
          </span>
        ))}
      </span>
    ) : (
      title
    );

  return (
    <Tag
      className={[styles.root, styles[variant], className]
        .filter(Boolean)
        .join(" ")}
    >
      {content}
    </Tag>
  );
}
