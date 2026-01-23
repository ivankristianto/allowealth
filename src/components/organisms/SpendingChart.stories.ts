import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Organisms/SpendingChart',
  tags: ['autodocs'],
  argTypes: {
    data: {
      control: 'object',
      description: 'Array of spending categories with percentages',
    },
    totalSpent: {
      control: 'number',
      description: 'Total amount spent',
    },
    totalBudget: {
      control: 'number',
      description: 'Total budget amount',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading state',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
  },
};

export default meta;

type Story = StoryObj;

// Default data matching POC design
const defaultData = [
  { category: 'Housing', percentage: 45, color: '#ef4444' },
  { category: 'Groceries', percentage: 22, color: '#3b82f6' },
  { category: 'Dining', percentage: 12, color: '#f59e0b' },
  { category: 'Transport', percentage: 8, color: '#8b5cf6' },
  { category: 'Savings', percentage: 13, color: '#10b981' },
];

export const Default: Story = {
  args: {
    data: defaultData,
    totalSpent: 53694000,
    totalBudget: 65900000,
    loading: false,
    error: '',
  },
  render: (args) => html`
    <spending-chart
      data="${JSON.stringify(args.data)}"
      total-spent="${args.totalSpent}"
      total-budget="${args.totalBudget}"
      ?loading="${args.loading}"
      error="${args.error}"
    ></spending-chart>
  `,
};

export const HighSpending: Story = {
  args: {
    data: [
      { category: 'Housing', percentage: 45, color: '#ef4444' },
      { category: 'Groceries', percentage: 22, color: '#3b82f6' },
      { category: 'Dining', percentage: 12, color: '#f59e0b' },
      { category: 'Transport', percentage: 8, color: '#8b5cf6' },
      { category: 'Savings', percentage: 13, color: '#10b981' },
    ],
    totalSpent: 59600000,
    totalBudget: 65900000,
    loading: false,
    error: '',
  },
  render: (args) => html`
    <spending-chart
      data="${JSON.stringify(args.data)}"
      total-spent="${args.totalSpent}"
      total-budget="${args.totalBudget}"
      ?loading="${args.loading}"
      error="${args.error}"
    ></spending-chart>
  `,
};

export const LowSpending: Story = {
  args: {
    data: [
      { category: 'Housing', percentage: 30, color: '#ef4444' },
      { category: 'Groceries', percentage: 20, color: '#3b82f6' },
      { category: 'Dining', percentage: 10, color: '#f59e0b' },
      { category: 'Transport', percentage: 5, color: '#8b5cf6' },
      { category: 'Savings', percentage: 35, color: '#10b981' },
    ],
    totalSpent: 35000000,
    totalBudget: 65900000,
    loading: false,
    error: '',
  },
  render: (args) => html`
    <spending-chart
      data="${JSON.stringify(args.data)}"
      total-spent="${args.totalSpent}"
      total-budget="${args.totalBudget}"
      ?loading="${args.loading}"
      error="${args.error}"
    ></spending-chart>
  `,
};

export const FewCategories: Story = {
  args: {
    data: [
      { category: 'Housing', percentage: 70, color: '#ef4444' },
      { category: 'Transport', percentage: 30, color: '#8b5cf6' },
    ],
    totalSpent: 45000000,
    totalBudget: 65900000,
    loading: false,
    error: '',
  },
  render: (args) => html`
    <spending-chart
      data="${JSON.stringify(args.data)}"
      total-spent="${args.totalSpent}"
      total-budget="${args.totalBudget}"
      ?loading="${args.loading}"
      error="${args.error}"
    ></spending-chart>
  `,
};

export const ManyCategories: Story = {
  args: {
    data: [
      { category: 'Housing', percentage: 35, color: '#ef4444' },
      { category: 'Groceries', percentage: 18, color: '#3b82f6' },
      { category: 'Dining', percentage: 10, color: '#f59e0b' },
      { category: 'Transport', percentage: 7, color: '#8b5cf6' },
      { category: 'Utilities', percentage: 8, color: '#06b6d4' },
      { category: 'Entertainment', percentage: 6, color: '#ec4899' },
      { category: 'Healthcare', percentage: 5, color: '#10b981' },
      { category: 'Savings', percentage: 11, color: '#84cc16' },
    ],
    totalSpent: 53694000,
    totalBudget: 65900000,
    loading: false,
    error: '',
  },
  render: (args) => html`
    <spending-chart
      data="${JSON.stringify(args.data)}"
      total-spent="${args.totalSpent}"
      total-budget="${args.totalBudget}"
      ?loading="${args.loading}"
      error="${args.error}"
    ></spending-chart>
  `,
};

export const Loading: Story = {
  args: {
    data: defaultData,
    totalSpent: 53694000,
    totalBudget: 65900000,
    loading: true,
    error: '',
  },
  render: (args) => html`
    <spending-chart
      data="${JSON.stringify(args.data)}"
      total-spent="${args.totalSpent}"
      total-budget="${args.totalBudget}"
      ?loading="${args.loading}"
      error="${args.error}"
    ></spending-chart>
  `,
};

export const Error: Story = {
  args: {
    data: defaultData,
    totalSpent: 53694000,
    totalBudget: 65900000,
    loading: false,
    error: 'Failed to load spending data. Please try again.',
  },
  render: (args) => html`
    <spending-chart
      data="${JSON.stringify(args.data)}"
      total-spent="${args.totalSpent}"
      total-budget="${args.totalBudget}"
      ?loading="${args.loading}"
      error="${args.error}"
    ></spending-chart>
  `,
};

export const Empty: Story = {
  args: {
    data: [],
    totalSpent: 0,
    totalBudget: 65900000,
    loading: false,
    error: '',
  },
  render: (args) => html`
    <spending-chart
      data="${JSON.stringify(args.data)}"
      total-spent="${args.totalSpent}"
      total-budget="${args.totalBudget}"
      ?loading="${args.loading}"
      error="${args.error}"
    ></spending-chart>
  `,
};

// Register custom element for Storybook
customElements.define(
  'spending-chart',
  class extends HTMLElement {
    connectedCallback() {
      const dataAttr = this.getAttribute('data');
      const totalSpent = Number(this.getAttribute('total-spent') ?? '0');
      const totalBudget = Number(this.getAttribute('total-budget') ?? '0');
      const loading = this.hasAttribute('loading');
      const error = this.getAttribute('error') ?? '';

      this.className = 'block max-w-md';

      let data: Array<{ category: string; percentage: number; color?: string }> = [];
      try {
        data = dataAttr ? JSON.parse(dataAttr) : [];
      } catch {
        data = [];
      }

      const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

      // Chart colors from POC design
      const DEFAULT_COLORS = [
        '#ef4444', // red
        '#3b82f6', // blue
        '#f59e0b', // orange
        '#8b5cf6', // purple
        '#10b981', // green
      ];

      // Error state
      if (error) {
        this.innerHTML = `
          <div class="bg-base-100 rounded-2xl border border-error/50 bg-error/5 shadow-premium p-8">
            <div class="flex items-center gap-3 text-error p-6 text-center">
              <div class="flex-1">
                <p class="font-semibold text-sm">${error}</p>
              </div>
            </div>
          </div>
        `;
        return;
      }

      // Empty state
      if (data.length === 0) {
        this.innerHTML = `
          <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
            <div class="flex flex-col gap-6">
              <div>
                <h4 class="font-bold text-xl text-base-content leading-none tracking-tight">
                  Spending analysis
                </h4>
                <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/60 mt-2">
                  BY MAJOR CATEGORIES
                </p>
              </div>
              <div class="p-12 text-center">
                <p class="text-base-content/60 font-medium">No spending data available yet.</p>
              </div>
            </div>
          </div>
        `;
        return;
      }

      // Loading state
      if (loading) {
        this.innerHTML = `
          <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
            <div class="flex flex-col gap-6">
              <div>
                <h4 class="font-bold text-xl text-base-content leading-none tracking-tight">
                  Spending analysis
                </h4>
                <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/60 mt-2">
                  BY MAJOR CATEGORIES
                </p>
              </div>
              <div class="flex flex-col md:flex-row items-center gap-8 py-6">
                <div class="h-[180px] w-full md:w-[180px] shrink-0">
                  <div class="w-full h-full rounded-full bg-base-300/30 animate-pulse mx-auto" style="width: 180px; height: 180px;"></div>
                </div>
                <div class="flex-1 w-full space-y-3">
                  ${Array.from({ length: 4 })
                    .map(
                      () => `
                    <div class="flex items-center justify-between p-3.5 rounded-2xl">
                      <div class="flex items-center gap-3">
                        <div class="w-3.5 h-3.5 rounded-lg bg-base-300 animate-pulse"></div>
                        <div class="h-4 bg-base-300 rounded w-24 animate-pulse"></div>
                      </div>
                      <div class="h-4 bg-base-300 rounded w-10 animate-pulse"></div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            </div>
          </div>
        `;
        return;
      }

      // Normal state - static rendering for Storybook
      // Note: Interactive Chart.js chart would initialize on client-side
      const chartColors = data.map((d, i) => d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]);

      this.innerHTML = `
        <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
          <div class="flex flex-col gap-6">
            <!-- Header -->
            <div>
              <h4 class="font-bold text-xl text-base-content leading-none tracking-tight">
                Spending analysis
              </h4>
              <p class="text-[10px] font-bold uppercase tracking-widest text-base-content/60 mt-2">
                BY MAJOR CATEGORIES
              </p>
            </div>

            <!-- Chart and Legend (Static representation for Storybook) -->
            <div class="flex flex-col md:flex-row items-center gap-8 py-2">
              <!-- Chart Placeholder -->
              <div class="h-[180px] w-full md:w-[180px] relative shrink-0">
                <div class="w-full h-full rounded-full relative" style="background: conic-gradient(
                  ${chartColors
                    .map((color, i) => {
                      const startAngle = data.slice(0, i).reduce((sum, d) => sum + d.percentage, 0);
                      const endAngle = startAngle + data[i].percentage;
                      return `${color} ${startAngle * 3.6}deg ${endAngle * 3.6}deg`;
                    })
                    .join(', ')}
                );">
                  <div class="absolute inset-0 m-4 bg-base-100 rounded-full flex items-center justify-center">
                    <div class="text-center">
                      <span class="text-2xl font-bold text-base-content tracking-tighter block">
                        ${overallPercentage}%
                      </span>
                      <span class="text-[10px] font-bold text-base-content/50 tracking-wide uppercase block mt-1">
                        Spent
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Legend -->
              <div class="flex-1 space-y-3 w-full" role="list">
                ${data
                  .slice(0, 5)
                  .map(
                    (item) => `
                  <div class="flex items-center justify-between p-3.5 rounded-2xl border border-transparent hover:bg-base-200/50 cursor-pointer opacity-80 hover:opacity-100 transition-all">
                    <div class="flex items-center gap-3">
                      <div class="w-3.5 h-3.5 rounded-lg shadow-sm" style="background-color: ${item.color || DEFAULT_COLORS[0]}"></div>
                      <span class="text-base font-semibold text-base-content tracking-tight">
                        ${item.category}
                      </span>
                    </div>
                    <span class="text-base font-bold text-base-content">
                      ${item.percentage}%
                    </span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }
);
