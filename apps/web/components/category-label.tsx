import styles from "./category-label.module.css";
import type { Category } from "@/content/types";

type CategoryLabelProps = {
  category: Category;
};

export function CategoryLabel({ category }: CategoryLabelProps) {
  return <span className={styles.label}>{category.name}</span>;
}
