import styles from "./quote-block.module.css";

type QuoteBlockProps = {
  children: React.ReactNode;
};

export function QuoteBlock({ children }: QuoteBlockProps) {
  return (
    <blockquote className={styles.quote}>
      <div>{children}</div>
    </blockquote>
  );
}
