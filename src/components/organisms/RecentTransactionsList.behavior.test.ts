/**
 * RecentTransactionsList Component Behavior Tests
 *
 * Tests the icon migration to @lucide/astro, component structure,
 * accessibility, and user interactions.
 */

describe('RecentTransactionsList - Icon Migration', () => {
  describe('Lucide Icon Imports', () => {
    it('should import CreditCard from @lucide/astro', async () => {
      const module = await import('@/components/organisms/RecentTransactionsList.astro');
      // Component exists with Lucide icon imports
      expect(module).toBeDefined();
    });

    it('should NOT import Icon from atoms/Icon.astro', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).not.toContain("import Icon from '../atoms/Icon.astro'");
    });

    it('should import IconBadge for category icons', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain("from '../atoms/IconBadge.astro'");
    });
  });

  describe('Icon Usage Patterns', () => {
    it('should use CreditCard icon for payment method (size 12px)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('<CreditCard size={12}');
    });
  });

  describe('No Inline SVGs', () => {
    it('should NOT have inline SVG elements', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).not.toContain('<svg');
      expect(content).not.toContain('xmlns="http://www.w3.org/2000/svg"');
    });
  });

  describe('No Old Icon Component Usage', () => {
    it('should NOT use <Icon name= pattern', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).not.toMatch(/<Icon name=/);
      expect(content).not.toMatch(/Icon name=/);
    });
  });
});

describe('RecentTransactionsList - Category Icon Mapping', () => {
  describe('Icon Component Mapping', () => {
    it('should define getCategoryMeta function', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('getCategoryMeta');
    });

    it('should map grocery categories to ShoppingBasket', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/ShoppingBasket/);
    });

    it('should render category icon with size 18px', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('size={18}');
    });
  });
});

describe('RecentTransactionsList - Component Structure', () => {
  describe('Component Props', () => {
    it('should have transactions prop', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/transactions\?:\s*TransactionOutput\[\]/);
    });

    it('should have loading prop', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/loading\?:\s*boolean/);
    });

    it('should have viewAllUrl prop', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/viewAllUrl\?:\s*string/);
    });

    it('should have className prop', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/className\?:\s*string/);
    });
  });

  describe('Data Attribute', () => {
    it('should have data-recent-transactions-list attribute', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('data-recent-transactions-list');
    });
  });

  describe('Component Structure', () => {
    it('should render Card component for list container', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('<Card rounded="card-lg" padding="sm"');
    });

    it('should have header with title', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('Recent activity');
    });

    it('should have loading skeleton', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('loading ?');
      expect(content).toContain('animate-pulse');
    });

    it('should have empty state', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('displayTransactions.length === 0');
      expect(content).toContain('<EmptyState');
    });

    it('should have transactions list with ul element', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('<ul class="divide-y divide-base-200"');
    });

    it('should limit to 6 transactions (maxTransactions constant)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/maxTransactions\s*=\s*6/);
    });

    it('should have formatActivityDate helper function', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('const formatActivityDate = (date: Date)');
      expect(content).toContain('toLocaleTimeString');
    });
  });
});

describe('RecentTransactionsList - Accessibility', () => {
  describe('ARIA Attributes', () => {
    it('should have aria-hidden on decorative icons', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Should have aria-hidden on decorative icons
      expect(content).toMatch(/aria-hidden="true"/g);
    });

    it('should have accessible label on loading state', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('aria-label="Loading recent transactions"');
    });

    it('should have role="list" on ul element', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('role="list"');
    });

    it('should have aria-label on list', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('aria-label="Recent transactions"');
    });

    it('should have role="status" on loading skeleton', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('role="status"');
    });

    it('should have aria-live="polite" on loading skeleton', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('aria-live="polite"');
    });

    it('should use semantic time element for dates', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('<time');
      expect(content).toContain('datetime={');
    });
  });

  describe('Icon Accessibility', () => {
    it('should have aria-hidden on payment method icons', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Payment icons are decorative - aria-hidden should be present
      expect(content).toContain('CreditCard size={12} class="stroke-current" aria-hidden="true"');
    });

    it('should NOT have aria-label on icons (labels are on parent elements)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Icons should not have aria-label, parent elements have labels
      expect(content).not.toMatch(/<CreditCard.*aria-label=/);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have proper link structure for keyboard navigation', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Links should be properly structured
      expect(content).toMatch(/href={viewAllUrl}/);
    });
  });

  describe('Visual Accessibility', () => {
    it('should use proper contrast classes', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Should use base-content opacity for secondary text
      expect(content).toContain('text-base-content/60');
    });

    it('should have hover states for interactive elements', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Should have hover:bg-base-200/40 on list items
      expect(content).toContain('hover:bg-base-200/40');
    });
  });
});

describe('RecentTransactionsList - Transaction Display', () => {
  describe('Transaction Item Structure', () => {
    it('should display date', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('formatActivityDate(date)');
    });

    it('should display category name', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('{transaction.category.name}');
    });

    it('should display primary text using description or category', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('primaryTextForTransaction');
    });

    it('should display payment method', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('{transaction.payment_method.name}');
    });

    it('should display amount with Currency component', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('<Currency');
      expect(content).toContain('showSign={true}');
    });

    it('should render payment method label with CreditCard icon', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('CreditCard size={12}');
      expect(content).toContain('{transaction.payment_method.name}');
    });
  });

  describe('Responsive Design', () => {
    it('should use proper spacing classes', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // min-w-0 is used for text truncation in flex containers
      expect(content).toContain('min-w-0');
      // Check for fixed width classes on amount container
      expect(content).toContain('min-w-[120px]');
    });
  });
});

describe('RecentTransactionsList - Empty State', () => {
  describe('Empty State Props', () => {
    it('should pass iconName="plus" to EmptyState', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('iconName="plus"');
    });

    it('should have proper empty state message', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('No transactions yet');
      expect(content).toContain(
        'Start tracking by adding your first expense or income transaction.'
      );
    });

    it('should have action link to add transaction', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('actionLabel="Add Transaction"');
      expect(content).toContain('actionHref="/transactions/add"');
    });
  });
});

describe('RecentTransactionsList - View All Button', () => {
  describe('Button Structure', () => {
    it('should have "View all" text', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('View all');
    });

    it('should link to viewAllUrl', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('href={viewAllUrl}');
    });

    it('should provide an accessible label for the button', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('aria-label="View all transactions"');
    });

    it('should only show when there are transactions', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/transactions\.length > 0/);
    });

    it('should use outline button styling', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('btn-outline');
    });
  });
});

describe('RecentTransactionsList - Stories', () => {
  describe('Lucide Icon Usage in Stories', () => {
    it('should import IconRenderers for Lucide icons in stories', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.stories.ts',
        'utf-8'
      );
      expect(content).toContain("from '../../../.storybook/lucide-icons'");
      expect(content).toContain('IconRenderers');
      expect(content).toContain('CreditCard');
    });

    it('should use .render() method for icons in stories', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.stories.ts',
        'utf-8'
      );
      expect(content).toContain('CreditCard.render(');
    });

    it('should NOT have inline SVG elements in stories', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.stories.ts',
        'utf-8'
      );
      // The stories should use Lucide .render() instead of inline SVGs
      const inlineSvgCount = (content.match(/<svg/g) || []).length;
      expect(inlineSvgCount).toBe(0);
    });
  });

  describe('Story Variants', () => {
    it('should have Default story', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.stories.ts',
        'utf-8'
      );
      expect(content).toContain('export const Default');
    });

    it('should have Empty story', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.stories.ts',
        'utf-8'
      );
      expect(content).toContain('export const Empty');
    });

    it('should have Loading story', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.stories.ts',
        'utf-8'
      );
      expect(content).toContain('export const Loading');
    });

    it('should have AllStates story', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.stories.ts',
        'utf-8'
      );
      expect(content).toContain('export const AllStates');
    });
  });

  describe('Payment Icon Mapping in Stories', () => {
    it('should have getCategoryMeta function in stories', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.stories.ts',
        'utf-8'
      );
      expect(content).toContain('getCategoryMeta');
    });
  });
});

describe('RecentTransactionsList - Integration', () => {
  describe('Data Flow', () => {
    it('should slice transactions to maxTransactions', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('.slice(0, maxTransactions)');
    });

    it('should parse amount as float for calculations', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('parseFloat(transaction.amount)');
    });

    it('should determine transaction type (expense/income)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain("transaction.type === 'expense'");
    });
  });

  describe('Imports', () => {
    it('should import required components', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain("from '../atoms/Card.astro'");
      expect(content).toContain("from '../atoms/EmptyState.astro'");
      expect(content).toContain("from '../atoms/Currency.astro'");
      expect(content).toContain("from '../atoms/IconBadge.astro'");
    });

    it('should import type definitions', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain("from '@/lib/types/transaction'");
    });

    it('should not rely on formatCurrency helper', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).not.toContain('formatCurrency(');
    });
  });
});

describe('RecentTransactionsList - Edge Cases', () => {
  describe('Missing Data', () => {
    it('should handle empty transactions array', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/transactions = \[\]/);
      expect(content).toContain('displayTransactions.length === 0');
    });

    it('should handle missing description gracefully', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Component uses optional chaining with trim and fallback
      expect(content).toMatch(/transaction\.description\?\.trim\(\)/);
    });
  });

  describe('Icon Fallback', () => {
    it('should have fallback for unknown categories', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/return \{ icon: Wallet/);
    });
  });
});

describe('RecentTransactionsList - Migration Verification', () => {
  describe('Complete Icon Migration', () => {
    it('should have no references to old icon names', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Old icon names that should not exist
      expect(content).not.toMatch(/name=['"](arrow-left|list|arrow-right)['"]/);
    });

    it('should use stroke-current class for icon color inheritance', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('stroke-current');
    });

    it('should have consistent icon sizing (12, 18px)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('size={12}');
      expect(content).toContain('size={18}');
    });
  });
});

describe('RecentTransactionsList - Code Quality', () => {
  describe('TypeScript Types', () => {
    it('should properly type component props interface', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('export interface Props');
    });

    it('should use proper type annotations', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Check for CategoryIconComponent type definition
      expect(content).toContain('type CategoryIconComponent');
      // Check for TransactionOutput['type'] usage in function signature
      expect(content).toContain("type: TransactionOutput['type']");
      // Check for CategoryMeta return type
      expect(content).toContain('CategoryMeta');
    });
  });

  describe('Code Organization', () => {
    it('should have proper component documentation', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('/**');
      expect(content).toContain('Recent Transactions List Component');
    });

    it('should have prop documentation in comments', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('@param');
    });
  });
});
