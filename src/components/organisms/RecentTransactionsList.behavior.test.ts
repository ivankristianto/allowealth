/**
 * RecentTransactionsList Component Behavior Tests
 *
 * Tests the RecentTransactionsList organism component which displays
 * the most recent transactions using the TransactionCard component.
 *
 * Note: Detailed transaction display tests are in TransactionCard.behavior.test.ts
 * This file tests the container logic, limits, loading states, and empty states.
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'bun:test';

const COMPONENT_PATH = 'src/components/organisms/RecentTransactionsList.astro';
const componentContent = readFileSync(COMPONENT_PATH, 'utf8');

describe('RecentTransactionsList', () => {
  describe('Component Structure', () => {
    it('should import required components', () => {
      expect(componentContent).toContain("import Card from '../atoms/Card.astro'");
      expect(componentContent).toContain("import EmptyState from '../atoms/EmptyState.astro'");
      expect(componentContent).toContain(
        "import TransactionCard from '../molecules/TransactionCard.astro'"
      );
    });

    it('should import TransactionOutput type', () => {
      expect(componentContent).toContain(
        "import type { TransactionOutput } from '@/lib/types/transaction'"
      );
    });

    it('should have Props interface', () => {
      expect(componentContent).toContain('export interface Props');
      expect(componentContent).toContain('transactions?: TransactionOutput[]');
      expect(componentContent).toContain('loading?: boolean');
      expect(componentContent).toContain('viewAllUrl?: string');
      expect(componentContent).toContain('className?: string');
    });

    it('should have data-recent-transactions-list attribute', () => {
      expect(componentContent).toContain('data-recent-transactions-list');
    });
  });

  describe('Transaction Limit', () => {
    it('should define maxTransactions constant', () => {
      expect(componentContent).toContain('const maxTransactions = 10');
    });

    it('should slice transactions to max limit', () => {
      expect(componentContent).toContain('transactions.slice(0, maxTransactions)');
    });
  });

  describe('Header Section', () => {
    it('should display "Recent activity" heading', () => {
      expect(componentContent).toContain('Recent activity');
    });

    it('should have "View all" link', () => {
      expect(componentContent).toContain('View all');
      expect(componentContent).toContain('href={viewAllUrl}');
      expect(componentContent).toContain('aria-label="View all transactions"');
    });

    it('should conditionally show "View all" link', () => {
      expect(componentContent).toContain('!loading && transactions.length > 0');
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      expect(componentContent).toContain('loading ?');
      expect(componentContent).toContain('animate-pulse');
    });

    it('should have ARIA attributes for loading state', () => {
      expect(componentContent).toContain('role="status"');
      expect(componentContent).toContain('aria-live="polite"');
      expect(componentContent).toContain('aria-label="Loading recent transactions"');
    });

    it('should show 10 skeleton items', () => {
      expect(componentContent).toContain('Array.from({ length: 10 })');
    });

    it('should have aria-hidden on skeleton items', () => {
      expect(componentContent).toContain('aria-hidden="true"');
    });
  });

  describe('Empty State', () => {
    it('should show EmptyState when no transactions', () => {
      expect(componentContent).toContain('displayTransactions.length === 0');
      expect(componentContent).toContain('<EmptyState');
    });

    it('should have appropriate empty state content', () => {
      expect(componentContent).toContain('title="No transactions yet"');
      expect(componentContent).toContain('Start tracking by adding your first');
      expect(componentContent).toContain('iconName="plus"');
      expect(componentContent).toContain('actionLabel="Add Transaction"');
      expect(componentContent).toContain('actionHref="/transactions/add"');
      expect(componentContent).toContain('variant="compact"');
    });
  });

  describe('Transaction List', () => {
    it('should render ul with semantic list markup', () => {
      expect(componentContent).toContain('<ul class="divide-y divide-base-200"');
      expect(componentContent).toContain('role="list"');
      expect(componentContent).toContain('aria-label="Recent transactions"');
    });

    it('should use TransactionCard component', () => {
      expect(componentContent).toContain('<TransactionCard');
      expect(componentContent).toContain('transaction={transaction}');
      expect(componentContent).toContain('showActions={false}');
    });

    it('should map over displayTransactions', () => {
      expect(componentContent).toContain('displayTransactions.map((transaction)');
    });

    it('should wrap each transaction in li element', () => {
      expect(componentContent).toContain('<li>');
      expect(componentContent).toContain('</li>');
    });
  });

  describe('Card Styling', () => {
    it('should use Card component with proper styling', () => {
      expect(componentContent).toContain('<Card');
      expect(componentContent).toContain('rounded="card-lg"');
      expect(componentContent).toContain('padding="sm"');
      expect(componentContent).toContain('className="p-0 overflow-hidden shadow-sm"');
    });

    it('should have proper spacing classes', () => {
      expect(componentContent).toContain('class={`space-y-5 ${className}`}');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic heading', () => {
      expect(componentContent).toContain('<h2');
    });

    it('should have proper ARIA labels', () => {
      expect(componentContent).toContain('aria-label');
    });

    it('should use semantic list elements', () => {
      expect(componentContent).toContain('role="list"');
    });
  });

  describe('Responsive Design', () => {
    it('should use DaisyUI classes', () => {
      expect(componentContent).toContain('btn btn-outline btn-sm');
      expect(componentContent).toContain('text-accent');
      expect(componentContent).toContain('divide-base-200');
      expect(componentContent).toContain('bg-base-200');
    });
  });
});
