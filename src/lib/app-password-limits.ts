/**
 * Optional write limits on an app password. No DB imports, so components can share it.
 * A key that is present applies even when it matches nothing: an allowlist of deleted categories allows no writes.
 */

export interface AppPasswordLimits {
  /** Writes (transactions, recurring items) may only use these categories. */
  category_ids?: string[];
  /** Updates and deletes only reach transactions this token created. */
  own_transactions_only?: true;
}

export type AppPasswordLimitName = 'category' | 'own_transactions';

export const MAX_LIMIT_CATEGORY_IDS = 200;

/** Short labels for the token list, such as "2 categories" and "Own transactions only". */
export function describeAppPasswordLimits(limits: AppPasswordLimits): string[] {
  const labels: string[] = [];
  if (limits.category_ids !== undefined) {
    const count = limits.category_ids.length;
    labels.push(count === 1 ? '1 category' : `${count} categories`);
  }
  if (limits.own_transactions_only) labels.push('Own transactions only');
  return labels;
}

export interface LimitCategory {
  id: string;
  name: string;
  type: 'expense' | 'income';
  is_active: boolean;
}

const CATEGORY_GROUPS = [
  { type: 'expense', label: 'Expense' },
  { type: 'income', label: 'Income' },
] as const;

/** What the category picker offers: active categories, plus inactive ones still listed, so saving keeps them. */
export function limitCategoryGroups(
  categories: readonly LimitCategory[],
  limits: AppPasswordLimits
): Array<{ label: string; categories: LimitCategory[] }> {
  const listed = new Set(limits.category_ids ?? []);
  const offered = categories.filter((category) => category.is_active || listed.has(category.id));
  return CATEGORY_GROUPS.map(({ type, label }) => ({
    label,
    categories: offered.filter((category) => category.type === type),
  })).filter((group) => group.categories.length > 0);
}
