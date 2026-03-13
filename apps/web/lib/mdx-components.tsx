import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { QuoteBlock } from "@/components/quote-block";

export const mdxComponents: MDXComponents = {
  a: ({ href = "", children, ...props }) => {
    const isInternal = href.startsWith("/");

    if (isInternal) {
      return (
        <Link href={href} {...props}>
          {children}
        </Link>
      );
    }

    return (
      <a href={href} rel="noreferrer" target="_blank" {...props}>
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => <QuoteBlock>{children}</QuoteBlock>,
};
