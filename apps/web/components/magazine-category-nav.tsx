import Link from "next/link";
import styles from "./magazine-category-nav.module.css";
import { categories } from "@/content/categories";

type MagazineCategoryNavProps = {
  activeCategoryId?: string;
  hrefBase?: string;
  excludedCategoryIds?: string[];
  centered?: boolean;
};

export function MagazineCategoryNav({
  activeCategoryId,
  hrefBase = "/articles",
  excludedCategoryIds = [],
  centered = false,
}: MagazineCategoryNavProps) {
  const normalizedBase = hrefBase.endsWith("/")
    ? hrefBase.slice(0, -1)
    : hrefBase;
  const visibleCategories = categories.filter(
    (category) => !excludedCategoryIds.includes(category.id),
  );

  return (
    <section className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <nav
          aria-label="매거진 채널"
          className={`${styles.nav} ${centered ? styles.centered : ""}`.trim()}
        >
          {visibleCategories.map((category) => (
            <Link
              key={category.id}
              href={`${normalizedBase}/${category.slug}`}
              aria-current={activeCategoryId === category.id ? "page" : undefined}
              className={`${styles.link} ${
                activeCategoryId === category.id ? styles.active : ""
              }`.trim()}
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
