import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Organisms/BudgetCard',
  tags: ['autodocs'],
  argTypes: {
    categoryName: {
      control: 'text',
      description: 'Name of the budget category',
    },
    icon: {
      control: 'select',
      options: [
        'Home',
        'ShoppingCart',
        'Utensils',
        'Car',
        'Film',
        'Zap',
        'Briefcase',
        'Heart',
        'Plane',
      ],
      description: 'Icon name for the category',
    },
    spent: {
      control: 'number',
      description: 'Amount spent',
    },
    budget: {
      control: 'number',
      description: 'Budget limit',
    },
    percentageUsed: {
      control: 'number',
      description: 'Percentage of budget used',
    },
    status: {
      control: 'select',
      options: ['ok', 'warning', 'exceeded'],
      description: 'Budget status',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency code',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading state',
    },
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: {
    categoryName: 'Housing',
    icon: 'Home',
    spent: 37680000,
    budget: 40000000,
    percentageUsed: 94,
    status: 'warning',
    currency: 'IDR',
    loading: false,
  },
  render: (args) => html`
    <budget-card
      category-name="${args.categoryName}"
      icon="${args.icon}"
      spent="${args.spent}"
      budget="${args.budget}"
      percentage-used="${args.percentageUsed}"
      status="${args.status}"
      currency="${args.currency}"
      ?loading="${args.loading}"
    ></budget-card>
  `,
};

export const Optimal: Story = {
  args: {
    categoryName: 'Transport',
    icon: 'Car',
    spent: 1200000,
    budget: 2500000,
    percentageUsed: 48,
    status: 'ok',
    currency: 'IDR',
    loading: false,
  },
  render: (args) => html`
    <budget-card
      category-name="${args.categoryName}"
      icon="${args.icon}"
      spent="${args.spent}"
      budget="${args.budget}"
      percentage-used="${args.percentageUsed}"
      status="${args.status}"
      currency="${args.currency}"
      ?loading="${args.loading}"
    ></budget-card>
  `,
};

export const Warning: Story = {
  args: {
    categoryName: 'Groceries',
    icon: 'ShoppingCart',
    spent: 5800000,
    budget: 8000000,
    percentageUsed: 72,
    status: 'warning',
    currency: 'IDR',
    loading: false,
  },
  render: (args) => html`
    <budget-card
      category-name="${args.categoryName}"
      icon="${args.icon}"
      spent="${args.spent}"
      budget="${args.budget}"
      percentage-used="${args.percentageUsed}"
      status="${args.status}"
      currency="${args.currency}"
      ?loading="${args.loading}"
    ></budget-card>
  `,
};

export const Exceeded: Story = {
  args: {
    categoryName: 'Dining',
    icon: 'Utensils',
    spent: 3500000,
    budget: 3000000,
    percentageUsed: 117,
    status: 'exceeded',
    currency: 'IDR',
    loading: false,
  },
  render: (args) => html`
    <budget-card
      category-name="${args.categoryName}"
      icon="${args.icon}"
      spent="${args.spent}"
      budget="${args.budget}"
      percentage-used="${args.percentageUsed}"
      status="${args.status}"
      currency="${args.currency}"
      ?loading="${args.loading}"
    ></budget-card>
  `,
};

export const USD: Story = {
  args: {
    categoryName: 'Entertainment',
    icon: 'Film',
    spent: 450,
    budget: 800,
    percentageUsed: 56,
    status: 'ok',
    currency: 'USD',
    loading: false,
  },
  render: (args) => html`
    <budget-card
      category-name="${args.categoryName}"
      icon="${args.icon}"
      spent="${args.spent}"
      budget="${args.budget}"
      percentage-used="${args.percentageUsed}"
      status="${args.status}"
      currency="${args.currency}"
      ?loading="${args.loading}"
    ></budget-card>
  `,
};

export const Loading: Story = {
  args: {
    categoryName: '',
    icon: 'Home',
    spent: 0,
    budget: 0,
    percentageUsed: 0,
    status: 'ok',
    currency: 'IDR',
    loading: true,
  },
  render: (args) => html`
    <budget-card
      category-name="${args.categoryName}"
      icon="${args.icon}"
      spent="${args.spent}"
      budget="${args.budget}"
      percentage-used="${args.percentageUsed}"
      status="${args.status}"
      currency="${args.currency}"
      ?loading="${args.loading}"
    ></budget-card>
  `,
};

// Register custom element for Storybook
customElements.define(
  'budget-card',
  class extends HTMLElement {
    connectedCallback() {
      const categoryName = this.getAttribute('category-name') ?? 'Category';
      const icon = this.getAttribute('icon') ?? 'CircleDollarSign';
      const spent = Number(this.getAttribute('spent') ?? '0');
      const budget = Number(this.getAttribute('budget') ?? '0');
      const percentageUsed = Number(this.getAttribute('percentage-used') ?? '0');
      const status = (this.getAttribute('status') ?? 'ok') as 'ok' | 'warning' | 'exceeded';
      const currency = this.getAttribute('currency') ?? 'IDR';
      const loading = this.hasAttribute('loading');

      this.className = 'block max-w-sm';

      // Format currency helper
      const formatCurrency = (amount: number, curr: string): string => {
        const config = {
          IDR: { symbol: 'Rp', decimals: 0, locale: 'id-ID' },
          USD: { symbol: '$', decimals: 2, locale: 'en-US' },
        }[curr] || { symbol: curr, decimals: 0, locale: 'en-US' };

        return new Intl.NumberFormat(config.locale, {
          style: 'currency',
          currency: curr,
          minimumFractionDigits: config.decimals,
          maximumFractionDigits: config.decimals,
        }).format(amount);
      };

      // Icon SVG mapping
      const icons: Record<string, string> = {
        Home: '<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>',
        ShoppingCart:
          '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
        Utensils:
          '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
        Car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8c-.3.5-.1 1.2.5 1.4l1.5.5C4 12.9 4 13.4 4 14v2c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
        Film: '<rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="2" x2="7" y1="7" y2="7"/><line x1="2" x2="7" y1="17" y2="17"/><line x1="17" x2="22" y1="17" y2="17"/><line x1="17" x2="22" y1="7" y2="7"/>',
        Zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
        Briefcase:
          '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
        Heart:
          '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
        Plane:
          '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
        CircleDollarSign:
          '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>',
      };

      const iconSvg = icons[icon] || icons.CircleDollarSign;

      // Status styling
      const statusClasses: Record<string, { badge: string; progress: string; footer: string }> = {
        ok: {
          badge: 'bg-success/10 text-success',
          progress: 'bg-success',
          footer: 'bg-base-200/50 border-base-300 text-base-content/60',
        },
        warning: {
          badge: 'bg-warning/10 text-warning',
          progress: 'bg-warning',
          footer: 'bg-base-200/50 border-base-300 text-base-content/60',
        },
        exceeded: {
          badge: 'bg-error/10 text-error',
          progress: 'bg-error',
          footer: 'bg-error/5 border-error/10 text-error',
        },
      };

      const statusStyle = statusClasses[status] || statusClasses.ok;
      const remaining = budget - spent;
      const isOver = remaining < 0;

      // Loading state
      if (loading) {
        this.innerHTML = `
          <div class="bg-base-100 rounded-card border border-base-300 shadow-sm p-6 lg:p-8">
            <div class="flex justify-between items-start mb-6">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-base-300 animate-pulse"></div>
                <div class="space-y-2">
                  <div class="h-4 bg-base-300 rounded w-24 animate-pulse"></div>
                  <div class="h-5 bg-base-300 rounded w-16 animate-pulse"></div>
                </div>
              </div>
              <div class="w-8 h-8 rounded-lg bg-base-300 animate-pulse"></div>
            </div>
            <div class="space-y-4">
              <div class="flex justify-between">
                <div class="space-y-1">
                  <div class="h-3 bg-base-300 rounded w-10 animate-pulse"></div>
                  <div class="h-5 bg-base-300 rounded w-24 animate-pulse"></div>
                </div>
                <div class="space-y-1 text-right">
                  <div class="h-3 bg-base-300 rounded w-12 animate-pulse"></div>
                  <div class="h-4 bg-base-300 rounded w-20 animate-pulse"></div>
                </div>
              </div>
              <div class="h-3 bg-base-300 rounded-full animate-pulse"></div>
              <div class="h-14 bg-base-300 rounded-2xl animate-pulse"></div>
            </div>
          </div>
        `;
        return;
      }

      this.innerHTML = `
        <article class="bg-base-100 rounded-card border border-base-300 shadow-sm hover:shadow-xl transition-all duration-300 p-6 lg:p-8 group" aria-label="Budget for ${categoryName}">
          <!-- Header -->
          <div class="flex justify-between items-start mb-6 lg:mb-8">
            <div class="flex items-center gap-3 lg:gap-4">
              <div class="p-4 bg-base-300 rounded-2xl shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-base-content">${iconSvg}</svg>
              </div>
              <div>
                <h3 class="font-bold text-base-content tracking-tight leading-none">${categoryName}</h3>
                <span class="inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusStyle.badge}">
                  ${Math.round(percentageUsed)}% Used
                </span>
              </div>
            </div>
            <button type="button" class="text-base-content/30 hover:text-base-content/60 transition-colors p-1 rounded-lg hover:bg-base-200" aria-label="Edit ${categoryName} budget">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="space-y-4">
            <div class="flex justify-between items-end">
              <div>
                <span class="label-premium uppercase tracking-widest font-semibold text-[10px] text-base-content/60">Spent</span>
                <p class="text-lg font-bold mt-1 text-base-content leading-none">${formatCurrency(spent, currency)}</p>
              </div>
              <div class="text-right">
                <span class="label-premium uppercase tracking-widest font-semibold text-[10px] text-base-content/60">Budget</span>
                <p class="text-sm font-bold mt-1 text-base-content/60 leading-none">${formatCurrency(budget, currency)}</p>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full bg-base-300 h-3 rounded-full overflow-hidden shadow-inner">
              <div class="h-full rounded-full transition-all duration-1000 shadow-md ${statusStyle.progress}" style="width: ${Math.min(100, percentageUsed)}%"></div>
            </div>

            <!-- Footer -->
            <div class="p-4 rounded-2xl border ${statusStyle.footer}">
              <div class="flex justify-between items-center text-xs font-bold leading-none">
                <span class="uppercase tracking-widest">${isOver ? 'Over budget by' : 'Left to spend'}</span>
                <span class="${isOver ? 'text-error' : 'text-base-content'}">${formatCurrency(Math.abs(remaining), currency)}</span>
              </div>
            </div>
          </div>
        </article>
      `;
    }
  }
);
