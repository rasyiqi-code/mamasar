import { asc, eq } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import type { Article } from './types';

function toArticle(row: typeof schema.articles.$inferSelect): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    image_url: row.image_url,
    summary: row.summary,
    content: row.content ?? undefined,
    created_at: row.created_at!.toISOString(),
  };
}

export async function getArticles(): Promise<Article[]> {
  const rows = await getDb().select().from(schema.articles).orderBy(asc(schema.articles.id));
  return rows.map(toArticle);
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  const [row] = await getDb().select().from(schema.articles).where(eq(schema.articles.slug, slug));
  return row ? toArticle(row) : undefined;
}
