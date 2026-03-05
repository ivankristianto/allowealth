import { SEEDER_CONFIG } from '../config';
/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Budgets Seeder
 */

import { db } from '@/db';
import { budgets } from '@/db/schema';
import { nanoid } from 'nanoid';
import { getSeedMonths } from '../lib/dates';
import { approxAmt } from '../lib/amounts';
import { EXPENSE_CATEGORIES } from '../data/categories';

export type Currency = 'IDR' | 'USD' | (string & {});

/**
 * Seed budgets for expense categories
 */
export async function seedBudgets(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>,
  monthsToSeed?: Array<{ year: number; month: number }>
): Promise<number> {
  console.log('📊 Seeding budgets...');

  const now = new Date();
  const months = monthsToSeed ?? getSeedMonths();

  const budgetRecords: Array<{
    id: string;
    workspace_id: string;
    created_by_user_id: string;
    category_id: string;
    month: number;
    year: number;
    budget_amount: string;
    currency: Currency;
    is_closed: boolean;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  }> = [];

  for (const { year, month } of months) {
    for (const cat of EXPENSE_CATEGORIES) {
      const categoryId = categoryMap.get(cat.name);
      if (!categoryId || cat.budget === 0) continue;

      budgetRecords.push({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: categoryId,
        month,
        year,
        budget_amount: approxAmt(cat.budget, SEEDER_CONFIG.PRIMARY_CURRENCY),
        currency: SEEDER_CONFIG.PRIMARY_CURRENCY,
        is_closed: false,
        notes: null,
        created_at: now,
        updated_at: now,
      });
    }
  }

  if (budgetRecords.length > 0) {
    await db.insert(budgets).values(budgetRecords);
  }

  console.log(`✓ Created ${budgetRecords.length} budget records`);
  return budgetRecords.length;
}
