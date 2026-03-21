import Image from "next/image";
import Link from "next/link";
import styles from "./representative-image.module.css";

type RepresentativeImageProps = {
  src: string;
  alt: string;
  href?: string;
  priority?: boolean;
  variant?: "lead" | "card" | "detail";
};

const imageDimensions = {
  lead: { width: 1200, height: 900, sizes: "(max-width: 960px) 100vw, 42vw" },
  card: { width: 800, height: 600, sizes: "(max-width: 760px) 100vw, 220px" },
  detail: { width: 1600, height: 1000, sizes: "(max-width: 760px) 100vw, 720px" },
} as const;

export function RepresentativeImage({
  src,
  alt,
  href,
  priority = false,
  variant = "card",
}: RepresentativeImageProps) {
  const config = imageDimensions[variant];

  const image = (
    <div className={`${styles.frame} ${styles[variant]}`.trim()}>
      <Image
        src={src}
        alt={alt}
        width={config.width}
        height={config.height}
        sizes={config.sizes}
        className={styles.image}
        priority={priority}
      />
    </div>
  );

  if (!href) {
    return image;
  }

  return (
    <Link href={href} className={styles.link} aria-label={alt}>
      {image}
    </Link>
  );
}
