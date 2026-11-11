import { and, desc, eq, sql } from 'drizzle-orm';
import * as schema from '../schema';
import { getDb } from '../client';
import type { CashbookEntry } from './types';

function toCashbookEntry(row: typeof schema.cashbook.$inferSelect): CashbookEntry {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    amount: row.amount,
    type: row.type,
    category: row.category ?? 'Penjualan',
    notes: row.notes ?? undefined,
    transaction_date: row.transaction_date ?? '',
    created_at: row.created_at!.toISOString(),
  };
}

export async function getCashbookEntries(userId: number, limit: number = 30): Promise<CashbookEntry[]> {
  const rows = await getDb()
    .select()
    .from(schema.cashbook)
    .where(eq(schema.cashbook.user_id, userId))
    .orderBy(desc(schema.cashbook.transaction_date), desc(schema.cashbook.id))
    .limit(limit);
  return rows.map(toCashbookEntry);
}

export async function getCashbookSummary(userId: number): Promise<{ totalIncome: number; totalExpense: number; balance: number }> {
  const [row] = await getDb()
    .select({
      total_income: sql<string | number>`COALESCE(SUM(CASE WHEN ${schema.cashbook.type} = 'income' THEN ${schema.cashbook.amount} ELSE 0 END), 0)`,
      total_expense: sql<string | number>`COALESCE(SUM(CASE WHEN ${schema.cashbook.type} = 'expense' THEN ${schema.cashbook.amount} ELSE 0 END), 0)`,
    })
    .from(schema.cashbook)
    .where(eq(schema.cashbook.user_id, userId));

  const totalIncome = Number(row?.total_income ?? 0);
  const totalExpense = Number(row?.total_expense ?? 0);
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

export async function addCashbookEntry(userId: number, data: {
  title: string;
  amount: number;
  type?: 'income' | 'expense';
  category?: string;
  notes?: string;
  transactionDate?: string;
}): Promise<CashbookEntry> {
  const type = data.type || 'income';
  const category = data.category || 'Penjualan';
  const transactionDate = data.transactionDate || new Date().toISOString().split('T')[0];

  const [created] = await getDb()
    .insert(schema.cashbook)
    .values({
      user_id: userId,
      title: data.title,
      amount: data.amount,
      type,
      category,
      notes: data.notes || '',
      transaction_date: transactionDate,
    })
    .returning({ id: schema.cashbook.id });

  return {
    id: created.id,
    user_id: userId,
    title: data.title,
    amount: data.amount,
    type,
    category,
    notes: data.notes || '',
    transaction_date: transactionDate,
    created_at: new Date().toISOString(),
  };
}

export async function deleteCashbookEntry(id: number, userId: number): Promise<boolean> {
  const rows = await getDb()
    .delete(schema.cashbook)
    .where(and(eq(schema.cashbook.id, id), eq(schema.cashbook.user_id, userId)))
    .returning({ id: schema.cashbook.id });
  return rows.length > 0;
}
