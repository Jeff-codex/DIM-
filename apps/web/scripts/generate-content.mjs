import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import { unified } from "unified";
import { z } from "zod";

const appDirectory = fileURLToPath(new URL("..", import.meta.url));
const articlesDirectory = path.join(appDirectory, "content", "articles");
const generatedDirectory = path.join(appDirectory, "content", "generated");
const generatedFile = path.join(generatedDirectory, "articles.generated.ts");
const publicDirectory = path.join(appDirectory, "public");

const articleSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  displayTitle: z.string().min(1).optional(),
  displayTitleLines: z.array(z.string().min(1)).min(1).optional(),
  cardTitle: z.string().min(1).optional(),
  cardTitleLines: z.array(z.string().min(1)).min(1).optional(),
  excerpt: z.string().min(1),
  interpretiveFrame: z.string().min(1),
  coverImage: z.string().min(1),
  categoryId: z.string().min(1),
  tagIds: z.array(z.string()).min(1),
  authorId: z.string().min(1),
  status: z.enum(["draft", "published"]),
  publishedAt: z
    .union([z.string(), z.date()])
    .transform((value, ctx) => {
      const parsed =
        value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);

      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "publishedAt must be a valid date string",
        });
        return z.NEVER;
      }

      return parsed.toISOString();
    }),
  featured: z.boolean(),
});

function serialize(value) {
  return JSON.stringify(value, null, 2);
}

async function renderMarkdown(source) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(source);

  return String(file);
}

async function generateContentModule() {
  const entries = await fs.readdir(articlesDirectory);
  const mdxEntries = entries
    .filter((entry) => entry.endsWith(".mdx"))
    .sort((a, b) => a.localeCompare(b));

  const sources = await Promise.all(
    mdxEntries.map(async (entry) => {
      const absolutePath = path.join(articlesDirectory, entry);
      const rawFile = await fs.readFile(absolutePath, "utf8");
      const { data, content } = matter(rawFile);
      const frontmatter = articleSchema.parse(data);
      const coverImagePath = path.join(
        publicDirectory,
        frontmatter.coverImage.replace(/^\//, ""),
      );

      await fs.access(coverImagePath);

      return {
        sourcePath: path.posix.join("content", "articles", entry),
        frontmatter,
        bodyHtml: await renderMarkdown(content),
      };
    }),
  );

  const fileContents = `import type { ArticleFrontmatter } from "@/content/types";

export type GeneratedArticleSource = {
  sourcePath: string;
  frontmatter: ArticleFrontmatter;
  bodyHtml: string;
};

export const generatedArticleSources: GeneratedArticleSource[] = ${serialize(
    sources,
  )};
`;

  await fs.mkdir(generatedDirectory, { recursive: true });
  await fs.writeFile(generatedFile, fileContents, "utf8");
}

generateContentModule().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
