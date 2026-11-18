import { asc, eq } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';

export interface CaseStudy {
  id: number;
  title: string;
  channel_name: string;
  tag: string;
  duration: string;
  video_url: string;
  thumbnail_url: string;
  practice_summary?: string;
  opportunity_summary?: string;
  sort_order: number;
  is_active: number;
  created_at: string;
}

function toCaseStudy(row: typeof schema.caseStudies.$inferSelect): CaseStudy {
  return {
    id: row.id,
    title: row.title,
    channel_name: row.channel_name,
    tag: row.tag,
    duration: row.duration,
    video_url: row.video_url,
    thumbnail_url: row.thumbnail_url,
    practice_summary: row.practice_summary ?? undefined,
    opportunity_summary: row.opportunity_summary ?? undefined,
    sort_order: row.sort_order ?? 0,
    is_active: row.is_active ?? 1,
    created_at: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
  };
}

export async function getActiveCaseStudies(): Promise<CaseStudy[]> {
  const rows = await getDb()
    .select()
    .from(schema.caseStudies)
    .where(eq(schema.caseStudies.is_active, 1))
    .orderBy(asc(schema.caseStudies.sort_order), asc(schema.caseStudies.id));
  return rows.map(toCaseStudy);
}

export async function getAllCaseStudies(): Promise<CaseStudy[]> {
  const rows = await getDb()
    .select()
    .from(schema.caseStudies)
    .orderBy(asc(schema.caseStudies.sort_order), asc(schema.caseStudies.id));
  return rows.map(toCaseStudy);
}

export async function getCaseStudyById(id: number): Promise<CaseStudy | undefined> {
  const [row] = await getDb()
    .select()
    .from(schema.caseStudies)
    .where(eq(schema.caseStudies.id, id));
  return row ? toCaseStudy(row) : undefined;
}

export interface CreateCaseStudyInput {
  title: string;
  channelName: string;
  tag: string;
  duration?: string;
  videoUrl: string;
  thumbnailUrl: string;
  practiceSummary?: string;
  opportunitySummary?: string;
  sortOrder?: number;
  isActive?: number;
}

export interface UpdateCaseStudyInput {
  title?: string;
  channelName?: string;
  tag?: string;
  duration?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  practiceSummary?: string;
  opportunitySummary?: string;
  sortOrder?: number;
  isActive?: number;
}

export async function createCaseStudy(input: CreateCaseStudyInput): Promise<CaseStudy> {
  const db = getDb();
  const [created] = await db
    .insert(schema.caseStudies)
    .values({
      title: input.title,
      channel_name: input.channelName,
      tag: input.tag,
      duration: input.duration || '15 Menit',
      video_url: input.videoUrl,
      thumbnail_url: input.thumbnailUrl,
      practice_summary: input.practiceSummary ?? null,
      opportunity_summary: input.opportunitySummary ?? null,
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? 1,
    })
    .returning();
  return toCaseStudy(created);
}

export async function updateCaseStudy(
  id: number,
  input: UpdateCaseStudyInput
): Promise<CaseStudy | undefined> {
  const db = getDb();
  const values: Partial<typeof schema.caseStudies.$inferInsert> = {};
  if (input.title !== undefined) values.title = input.title;
  if (input.channelName !== undefined) values.channel_name = input.channelName;
  if (input.tag !== undefined) values.tag = input.tag;
  if (input.duration !== undefined) values.duration = input.duration;
  if (input.videoUrl !== undefined) values.video_url = input.videoUrl;
  if (input.thumbnailUrl !== undefined) values.thumbnail_url = input.thumbnailUrl;
  if (input.practiceSummary !== undefined) values.practice_summary = input.practiceSummary;
  if (input.opportunitySummary !== undefined) values.opportunity_summary = input.opportunitySummary;
  if (input.sortOrder !== undefined) values.sort_order = input.sortOrder;
  if (input.isActive !== undefined) values.is_active = input.isActive;

  const [updated] = await db
    .update(schema.caseStudies)
    .set(values)
    .where(eq(schema.caseStudies.id, id))
    .returning();
  return updated ? toCaseStudy(updated) : undefined;
}

export async function deleteCaseStudy(id: number): Promise<boolean> {
  const db = getDb();
  const [deleted] = await db
    .delete(schema.caseStudies)
    .where(eq(schema.caseStudies.id, id))
    .returning({ id: schema.caseStudies.id });
  return Boolean(deleted);
}
