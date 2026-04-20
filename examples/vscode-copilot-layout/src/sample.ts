/**
 * Illustrative TypeScript file for testing path-specific instructions.
 */
export interface ArticleSummary {
  title: string;
  status: "draft" | "reviewed" | "published";
}

export function summarizeArticle(article: ArticleSummary): string {
  return `${article.title} [${article.status}]`;
}
