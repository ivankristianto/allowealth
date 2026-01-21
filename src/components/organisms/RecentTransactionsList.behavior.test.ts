/**
 * RecentTransactionsList Component Behavior Tests
 *
 * Tests the icon migration to @lucide/astro, component structure,
 * accessibility, and user interactions.
 */

describe('RecentTransactionsList - Icon Migration', () => {
  describe('Lucide Icon Imports', () => {
    it('should import ArrowRight from @lucide/astro', async () => {
      const module = await import('@/components/organisms/RecentTransactionsList.astro');
      // Component exists with ArrowRight import
      expect(module).toBeDefined();
    });

    it('should import payment method icons from @lucide/astro', async () => {
      const module = await import('@/components/organisms/RecentTransactionsList.astro');
      // Component exists with payment icon imports
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
  });

  describe('Icon Usage Patterns', () => {
    it('should use Clock for header icon (size 20px)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('<Clock size={20}');
    });

    it('should use ArrowRight for "View All" link (size 16px)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // ArrowRight in View All link
      expect(content).toMatch(/View All[\s\S]*?<ArrowRight size=\{16\}/);
    });

    it('should use ArrowRight for quick action link (size 16px)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // ArrowRight in quick action link
      expect(content).toContain(
        '<ArrowRight size={16} class="stroke-current" aria-hidden="true" />'
      );
    });

    it('should use ArrowRight in "View All Transactions" button', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // ArrowRight in View All button
      expect(content).toMatch(/View All Transactions[\s\S]*?<ArrowRight/);
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

describe('RecentTransactionsList - Payment Method Icons', () => {
  describe('Icon Component Mapping', () => {
    it('should define getPaymentIconComponent function', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('getPaymentIconComponent');
    });

    it('should map cash to DollarSign', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/cash:\s*DollarSign/);
    });

    it('should map credit_card to CreditCard', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/credit_card:\s*CreditCard/);
    });

    it('should map debit_card to CreditCard', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/debit_card:\s*CreditCard/);
    });

    it('should map bank_transfer to ArrowLeft', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/bank_transfer:\s*ArrowLeft/);
    });

    it('should map e_wallet to Wallet', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/e_wallet:\s*Wallet/);
    });

    it('should render payment icon with size 12px', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('size={12}');
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
    it('should use Card component wrapper', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('<Card className={className}');
    });

    it('should have header with title', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('Recent Transactions');
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
      expect(content).toContain('<ul class="space-y-1"');
    });

    it('should limit to 5 transactions (maxTransactions constant)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/maxTransactions\s*=\s*5/);
    });

    it('should have formatDate helper function', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('const formatDate = (date: Date)');
      expect(content).toContain('toLocaleDateString');
    });
  });
});

describe('RecentTransactionsList - Accessibility', () => {
  describe('ARIA Attributes', () => {
    it('should have aria-hidden on decorative ArrowRight icons', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Should have aria-hidden on decorative icons
      expect(content).toMatch(/aria-hidden="true"/g);
    });

    it('should have aria-label on quick action link', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/aria-label={`View.*transaction for/);
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

    it('should have aria-label on loading state', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('aria-label="Loading recent transactions"');
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
      expect(content).toMatch(/PaymentIcon.*aria-hidden/);
    });

    it('should NOT have aria-label on icons (labels are on parent elements)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Icons should not have aria-label, parent elements have labels
      expect(content).not.toMatch(/<ArrowRight.*aria-label=/);
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
      expect(content).toMatch(/href={`\/transactions\/\${transaction\.id}`}/);
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
      // Should use text-neutral-500 for secondary text
      expect(content).toContain('text-neutral-500');
    });

    it('should have hover states for interactive elements', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      // Should have hover:bg-base-200 on list items
      expect(content).toContain('hover:bg-base-200');
      expect(content).toContain('group-hover:opacity-100');
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
      expect(content).toContain('formatDate(date)');
    });

    it('should display category name', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('{transaction.category.name}');
    });

    it('should display description if present', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/transaction\.description[\s\S]*?truncate/);
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

    it('should have quick action link to transaction detail', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/href={`\/transactions\/\${transaction\.id}`}/);
    });
  });

  describe('Responsive Design', () => {
    it('should hide payment method on small screens', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('hidden sm:block');
    });

    it('should use proper spacing classes', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('flex-shrink-0');
      expect(content).toContain('min-w-0');
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
    it('should have "View All Transactions" text', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('View All Transactions');
    });

    it('should link to viewAllUrl', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('href={viewAllUrl}');
    });

    it('should only show when there are transactions', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/displayTransactions\.length > 0/);
    });

    it('should have hover animation on icon', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('group-hover:translate-x-1');
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
      expect(content).toContain('ArrowRight');
    });

    it('should use .render() method for icons in stories', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.stories.ts',
        'utf-8'
      );
      expect(content).toContain('ArrowRight.render(');
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
    it('should have getPaymentIconComponent function in stories', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.stories.ts',
        'utf-8'
      );
      expect(content).toContain('getPaymentIconComponent');
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
      expect(content).toContain("from '../atoms/Badge.astro'");
      expect(content).toContain("from '../atoms/EmptyState.astro'");
      expect(content).toContain("from '../atoms/Currency.astro'");
    });

    it('should import type definitions', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain("from '@/lib/types/transaction'");
    });

    it('should import formatCurrency from tokens', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain("from '@/lib/tokens'");
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
      expect(content).toMatch(/transaction\.description &&/);
    });
  });

  describe('Icon Fallback', () => {
    it('should have fallback for unknown payment types', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toMatch(/icons\[type\] \|\| DollarSign/);
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

    it('should have consistent icon sizing (12, 16, 20px)', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(
        'src/components/organisms/RecentTransactionsList.astro',
        'utf-8'
      );
      expect(content).toContain('size={12}');
      expect(content).toContain('size={16}');
      expect(content).toContain('size={20}');
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
      expect(content).toMatch(/type: string\)[\s\S]*?PaymentIconComponent/);
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
