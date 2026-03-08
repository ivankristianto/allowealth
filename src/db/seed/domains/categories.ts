/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

/**
 * Categories Seeder
 */

import { db } from '@/db';
import { categories, accountCategories } from '@/db/schema';
import { DEFAULT_ACCOUNT_CATEGORIES } from '@/lib/constants';
import { nanoid } from 'nanoid';
import { CATEGORY_STYLES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';

/**
 * Seed categories (income and expense)
 */
export async function seedCategories(
  workspaceId: string,
  userId: string
): Promise<Map<string, string>> {
  console.log('🏷️  Seeding categories...');

  const categoryMap = new Map<string, string>();
  const now = new Date();

  // Income categories
  for (const cat of INCOME_CATEGORIES) {
    const id = nanoid();
    const style = CATEGORY_STYLES[cat.name] || { icon: 'circle-dot', color: 'bg-slate-500' };
    await db.insert(categories).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: cat.name,
      type: 'income',
      income_source_type: cat.incomeSourceType ?? 'other',
      description: style.description || null,
      icon: style.icon,
      color: style.color,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    categoryMap.set(cat.name, id);
  }

  // Expense categories
  for (const cat of EXPENSE_CATEGORIES) {
    const id = nanoid();
    const style = CATEGORY_STYLES[cat.name] || { icon: 'tag', color: 'bg-slate-500' };
    await db.insert(categories).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: cat.name,
      type: 'expense',
      description: style.description || null,
      icon: style.icon,
      color: style.color,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    categoryMap.set(cat.name, id);
  }

  console.log(`✓ Created ${categoryMap.size} categories`);
  return categoryMap;
}

/**
 * Seed default account categories (system categories)
 */
export async function seedAccountCategories(
  workspaceId: string,
  userId: string
): Promise<Map<string, string>> {
  console.log('🏷️  Seeding account categories...');

  const categoryMap = new Map<string, string>();
  const now = new Date();

  for (const category of DEFAULT_ACCOUNT_CATEGORIES) {
    const id = nanoid();
    await db.insert(accountCategories).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: category.name,
      description: category.description,
      is_liability: category.isLiability,
      is_system: true,
      sort_order: category.sortOrder,
      created_at: now,
      updated_at: now,
    });
    categoryMap.set(category.legacyType, id);
  }

  console.log(`✓ Created ${categoryMap.size} account categories`);
  return categoryMap;
}
