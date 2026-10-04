import { describe, expect, it } from 'bun:test';
import { runSetup } from './setup';
import type { BackfillConfig } from './config.schema';

interface FakeCategory {
  id: string;
  name: string;
  type: string;
  transaction_count?: number;
}

interface FakeAccountCategory {
  id: string;
  name: string;
  isLiability?: boolean;
}

function fakeClient(state: {
  categories: FakeCategory[];
  accountCategories?: FakeAccountCategory[];
}) {
  let nextId = 0;
  state.accountCategories ??= [{ id: 'ac-bank', name: 'Bank Account' }];
  return {
    get: async (p: string) => {
      if (p.startsWith('/api/categories')) return state.categories;
      if (p.startsWith('/api/account-categories')) return state.accountCategories;
      return [];
    },
    post: async (p: string, b: Record<string, unknown>) => {
      const row = { id: `id-${nextId++}`, ...b } as FakeCategory & FakeAccountCategory;
      if (p.startsWith('/api/categories')) state.categories.push(row);
      if (p.startsWith('/api/account-categories')) state.accountCategories!.push(row);
      return row;
    },
    patch: async (p: string, b: Record<string, unknown>) => {
      const id = p.split('/').pop();
      const found = state.categories.find((c) => c.id === id);
      if (found && typeof b.name === 'string') found.name = b.name;
      return found ?? {};
    },
    del: async (p: string) => {
      const id = p.split('/').pop();
      state.categories = state.categories.filter((c) => c.id !== id);
      return {};
    },
    getAll: async () => [],
  };
}

const cfg = {
  categories: {
    expense: ['Cat1', 'Cat2'],
    income: [{ name: 'Inc1', sourceType: 'active' }],
  },
  categoryRenames: [{ from: 'Seeded', to: 'Cat2' }],
  accounts: [
    { name: 'Bank1 OwnerA', currency: 'IDR', owner: 'OwnerA', category: 'Bank Account' },
    { name: 'Deposit1 OwnerA', currency: 'IDR', owner: 'OwnerA', category: 'Time Deposit' },
  ],
} as unknown as BackfillConfig;

type Client = Parameters<typeof runSetup>[0];

describe('runSetup', () => {
  it('creates missing categories and reports them', async () => {
    const state = { categories: [] as FakeCategory[] };
    const r = await runSetup(fakeClient(state) as unknown as Client, cfg, {});
    expect(r.created).toContain('category:Cat1');
    expect(r.created).toContain('category:Inc1');
  });

  it('is idempotent — a second run creates nothing', async () => {
    const state = { categories: [] as FakeCategory[] };
    const c = fakeClient(state) as unknown as Client;
    await runSetup(c, cfg, {});
    const second = await runSetup(c, cfg, {});
    expect(second.created).toEqual([]);
    expect(second.alreadyCorrect.length).toBeGreaterThan(0);
  });

  it('renames a seeded category rather than creating a duplicate', async () => {
    const state = { categories: [{ id: 's1', name: 'Seeded', type: 'expense' }] };
    const r = await runSetup(fakeClient(state) as unknown as Client, cfg, {});
    expect(r.created).not.toContain('category:Cat2');
    expect(state.categories.find((c) => c.name === 'Cat2')?.id).toBe('s1');
  });

  it('refuses to delete an unused seeded category that holds transactions', async () => {
    const state = {
      categories: [{ id: 'x', name: 'Unused', type: 'expense', transaction_count: 3 }],
    };
    const r = await runSetup(fakeClient(state) as unknown as Client, cfg, {});
    expect(r.warnings.join(' ')).toMatch(/Unused/);
    expect(state.categories.find((c) => c.id === 'x')).toBeDefined();
  });

  it('deletes an unused seeded category that holds nothing', async () => {
    const state = {
      categories: [{ id: 'x', name: 'Unused', type: 'expense', transaction_count: 0 }],
    };
    const r = await runSetup(fakeClient(state) as unknown as Client, cfg, {});
    expect(r.skipped.join(' ')).toMatch(/deleted empty category:Unused/);
    expect(r.warnings).toEqual([]);
    expect(state.categories.find((c) => c.id === 'x')).toBeUndefined();
  });

  it('creates an income category with its configured source type', async () => {
    const state = { categories: [] as FakeCategory[] };
    await runSetup(fakeClient(state) as unknown as Client, cfg, {});
    const inc = state.categories.find((c) => c.name === 'Inc1') as unknown as {
      income_source_type?: string;
    };
    expect(inc?.income_source_type).toBe('active');
  });
});

describe('runSetup account categories', () => {
  it('creates an account category the roster names but the workspace lacks, as an asset', async () => {
    const state = { categories: [] as FakeCategory[], accountCategories: undefined };
    const r = await runSetup(fakeClient(state) as unknown as Client, cfg, {});
    expect(r.created).toContain('account category:Time Deposit');
    const created = (
      state as { accountCategories?: FakeAccountCategory[] }
    ).accountCategories!.find((c) => c.name === 'Time Deposit');
    expect(created?.isLiability).toBe(false);
  });

  it('leaves an account category that already exists alone', async () => {
    const state = { categories: [] as FakeCategory[] };
    const r = await runSetup(fakeClient(state) as unknown as Client, cfg, {});
    expect(r.created).not.toContain('account category:Bank Account');
    expect(r.alreadyCorrect).toContain('account category:Bank Account');
  });

  it('creates account categories once across re-runs', async () => {
    const state = { categories: [] as FakeCategory[] };
    const c = fakeClient(state) as unknown as Client;
    await runSetup(c, cfg, {});
    const second = await runSetup(c, cfg, {});
    expect(second.created.filter((x) => x.startsWith('account category:'))).toEqual([]);
  });
});
