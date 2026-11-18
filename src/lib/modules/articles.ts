import { asc, eq } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import type { Article } from './types';
import { slugify } from '../utils';

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

export async function getArticleById(id: number): Promise<Article | undefined> {
  const [row] = await getDb().select().from(schema.articles).where(eq(schema.articles.id, id));
  return row ? toArticle(row) : undefined;
}

export interface CreateArticleInput {
  title: string;
  category: string;
  imageUrl: string;
  summary: string;
  content?: string;
  slug?: string;
}

export interface UpdateArticleInput {
  title?: string;
  category?: string;
  imageUrl?: string;
  summary?: string;
  content?: string;
  slug?: string;
}

export async function createArticle(input: CreateArticleInput): Promise<Article> {
  const db = getDb();
  const slug = input.slug || `${slugify(input.title)}-${Date.now().toString(36)}`;
  const [created] = await db
    .insert(schema.articles)
    .values({
      title: input.title,
      slug,
      category: input.category,
      image_url: input.imageUrl,
      summary: input.summary,
      content: input.content ?? null,
    })
    .returning();
  return toArticle(created);
}

export async function updateArticle(
  id: number,
  input: UpdateArticleInput
): Promise<Article | undefined> {
  const db = getDb();
  const values: Partial<typeof schema.articles.$inferInsert> = {};
  if (input.title !== undefined) values.title = input.title;
  if (input.category !== undefined) values.category = input.category;
  if (input.imageUrl !== undefined) values.image_url = input.imageUrl;
  if (input.summary !== undefined) values.summary = input.summary;
  if (input.content !== undefined) values.content = input.content;
  if (input.slug !== undefined) values.slug = input.slug;

  const [updated] = await db
    .update(schema.articles)
    .set(values)
    .where(eq(schema.articles.id, id))
    .returning();
  return updated ? toArticle(updated) : undefined;
}

export async function deleteArticle(id: number): Promise<boolean> {
  const db = getDb();
  const [deleted] = await db
    .delete(schema.articles)
    .where(eq(schema.articles.id, id))
    .returning({ id: schema.articles.id });
  return Boolean(deleted);
}
