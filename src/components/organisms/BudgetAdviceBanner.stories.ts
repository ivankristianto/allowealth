import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Organisms/BudgetAdviceBanner',
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Banner title',
    },
    categoryName: {
      control: 'text',
      description: 'Name of the category for the advice',
    },
    status: {
      control: 'select',
      options: ['exceeded', 'warning'],
      description: 'Budget status type',
    },
    amount: {
      control: 'text',
      description: 'Formatted currency amount (overage or remaining)',
    },
    percentageUsed: {
      control: 'number',
      description: 'Percentage of budget used (for warning status)',
    },
    ctaText: {
      control: 'text',
      description: 'Call-to-action button text',
    },
    ctaUrl: {
      control: 'text',
      description: 'URL for CTA button (optional)',
    },
    dismissible: {
      control: 'boolean',
      description: 'Show dismiss button',
    },
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: {
    title: 'Budget Reallocation Advice',
    categoryName: 'Utilities',
    status: 'warning',
    amount: 'Rp400.000',
    percentageUsed: 85,
    ctaText: 'Review spending',
    ctaUrl: '/transactions',
    dismissible: true,
  },
  render: (args) => html`
    <budget-advice-banner
      title="${args.title}"
      category-name="${args.categoryName}"
      status="${args.status}"
      amount="${args.amount}"
      percentage-used="${args.percentageUsed}"
      cta-text="${args.ctaText}"
      cta-url="${args.ctaUrl}"
      ?dismissible="${args.dismissible}"
    ></budget-advice-banner>
  `,
};

export const ExceededWarning: Story = {
  args: {
    title: 'Budget Alert',
    categoryName: 'Dining',
    status: 'exceeded',
    amount: 'Rp500.000',
    percentageUsed: 117,
    ctaText: 'Review spending',
    ctaUrl: '/transactions?category=dining',
    dismissible: true,
  },
  render: (args) => html`
    <budget-advice-banner
      title="${args.title}"
      category-name="${args.categoryName}"
      status="${args.status}"
      amount="${args.amount}"
      percentage-used="${args.percentageUsed}"
      cta-text="${args.ctaText}"
      cta-url="${args.ctaUrl}"
      ?dismissible="${args.dismissible}"
    ></budget-advice-banner>
  `,
};

export const SavingsOpportunity: Story = {
  args: {
    title: 'Savings Opportunity',
    categoryName: 'Entertainment',
    status: 'warning',
    amount: 'Rp650.000',
    percentageUsed: 45,
    ctaText: 'Move to savings',
    ctaUrl: '',
    dismissible: true,
  },
  render: (args) => html`
    <budget-advice-banner
      title="${args.title}"
      category-name="${args.categoryName}"
      status="${args.status}"
      amount="${args.amount}"
      percentage-used="${args.percentageUsed}"
      cta-text="${args.ctaText}"
      cta-url="${args.ctaUrl}"
      ?dismissible="${args.dismissible}"
    ></budget-advice-banner>
  `,
};

export const NonDismissible: Story = {
  args: {
    title: 'Important Notice',
    categoryName: 'Housing',
    status: 'warning',
    amount: 'Rp2.000.000',
    percentageUsed: 92,
    ctaText: 'View changes',
    ctaUrl: '/budget/history',
    dismissible: false,
  },
  render: (args) => html`
    <budget-advice-banner
      title="${args.title}"
      category-name="${args.categoryName}"
      status="${args.status}"
      amount="${args.amount}"
      percentage-used="${args.percentageUsed}"
      cta-text="${args.ctaText}"
      cta-url="${args.ctaUrl}"
      ?dismissible="${args.dismissible}"
    ></budget-advice-banner>
  `,
};

export const USD: Story = {
  args: {
    title: 'Budget Reallocation Advice',
    categoryName: 'Transport',
    status: 'warning',
    amount: '$125.00',
    percentageUsed: 60,
    ctaText: 'Execute re-allocation',
    ctaUrl: '',
    dismissible: true,
  },
  render: (args) => html`
    <budget-advice-banner
      title="${args.title}"
      category-name="${args.categoryName}"
      status="${args.status}"
      amount="${args.amount}"
      percentage-used="${args.percentageUsed}"
      cta-text="${args.ctaText}"
      cta-url="${args.ctaUrl}"
      ?dismissible="${args.dismissible}"
    ></budget-advice-banner>
  `,
};

// Register custom element for Storybook
customElements.define(
  'budget-advice-banner',
  class extends HTMLElement {
    connectedCallback() {
      const title = this.getAttribute('title') ?? 'Budget Reallocation Advice';
      const categoryName = this.getAttribute('category-name') ?? '';
      const status = this.getAttribute('status') ?? 'warning';
      const amount = this.getAttribute('amount') ?? '';
      const percentageUsed = this.getAttribute('percentage-used') ?? '0';
      const ctaText = this.getAttribute('cta-text') ?? 'Execute re-allocation';
      const ctaUrl = this.getAttribute('cta-url') ?? '';
      const dismissible = this.hasAttribute('dismissible');

      this.className = 'block';

      // Sparkles icon SVG
      const sparklesIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
          <path d="M20 3v4"/>
          <path d="M22 5h-4"/>
          <path d="M4 17v2"/>
          <path d="M5 18H3"/>
        </svg>
      `;

      // X icon SVG
      const xIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"/>
          <path d="m6 6 12 12"/>
        </svg>
      `;

      // Escape HTML to prevent XSS in Storybook preview
      const escapeHtml = (text: string) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      // Generate message based on status (XSS-safe)
      const escapedCategoryName = escapeHtml(categoryName);
      const escapedAmount = escapeHtml(amount);
      const messageContent =
        status === 'exceeded'
          ? `Your <strong class="font-semibold">${escapedCategoryName}</strong> budget has been exceeded by <strong class="text-error font-bold">${escapedAmount}</strong>. Consider reviewing your spending or adjusting your budget allocation.`
          : `Your <strong class="font-semibold">${escapedCategoryName}</strong> budget is at <strong class="font-semibold">${percentageUsed}%</strong> usage. You have <strong class="text-info font-bold">${escapedAmount}</strong> remaining for this period.`;

      this.innerHTML = `
        <aside class="bg-info/5 border border-info/10 rounded-card p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 relative" role="complementary" aria-label="Budget advice" data-advice-banner>
          <!-- Icon Badge -->
          <div class="p-4 bg-info/10 text-info rounded-2xl shadow-sm shrink-0">
            ${sparklesIcon}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <span class="label-premium uppercase tracking-widest font-semibold text-[10px] text-base-content/60 mb-2 block">${escapeHtml(title)}</span>
            <p class="text-sm text-base-content leading-relaxed">
              ${messageContent}
            </p>
          </div>

          <!-- CTA Button -->
          ${
            ctaUrl
              ? `<a href="${escapeHtml(ctaUrl)}" class="btn btn-accent gap-2 rounded-2xl whitespace-nowrap shrink-0">${escapeHtml(ctaText)}</a>`
              : `<button type="button" class="btn btn-accent gap-2 rounded-2xl whitespace-nowrap shrink-0" data-execute-reallocation>${escapeHtml(ctaText)}</button>`
          }

          <!-- Dismiss Button -->
          ${
            dismissible
              ? `
            <button type="button" class="absolute top-3 right-3 p-1 text-base-content/40 hover:text-base-content/60 transition-colors rounded-lg hover:bg-base-200/50" aria-label="Dismiss advice" data-dismiss-advice>
              ${xIcon}
            </button>
          `
              : ''
          }
        </aside>
      `;

      // Handle dismiss functionality
      const dismissBtn = this.querySelector('[data-dismiss-advice]');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          const banner = this.querySelector('[data-advice-banner]');
          if (banner) {
            banner.classList.add('animate-out', 'fade-out', 'duration-200');
            setTimeout(() => {
              (banner as HTMLElement).style.display = 'none';
            }, 200);
          }
        });
      }
    }
  }
);
