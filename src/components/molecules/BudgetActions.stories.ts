/**
 * BudgetActions Stories
 *
 * Note: History and Copy controls are in BudgetHeaderControls (header slot).
 * BudgetActions contains: New Budget, Categories, Import, Export, Initialize All.
 * AI Rebalancer is intentionally hidden.
 */
import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/BudgetActions',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;

// SVG icons (aria-hidden for decorative icons per design system accessibility guidelines)
const tagsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/><path d="M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="6.5" cy="9.5" r=".5" fill="currentColor"/></svg>`;
const uploadIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`;
const downloadIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`;
const zapIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-12.1a.5.5 0 0 1 .88.46l-1.92 6.02a1 1 0 0 0 .95 1.31h7.13a1 1 0 0 1 .78 1.63L11.02 23.8a.5.5 0 0 1-.88-.46l1.92-6.02a1 1 0 0 0-.95-1.31z"/></svg>`;
const plusIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

const ghostBtn =
  'btn btn-ghost btn-sm md:btn-md min-h-[44px] min-w-[44px] gap-1 md:gap-2 rounded-lg md:rounded-xl text-base-content/70 hover:text-base-content hover:bg-base-200 px-2 md:px-4';
const accentGhostBtn =
  'btn btn-ghost btn-sm md:btn-md min-h-[44px] min-w-[44px] gap-1 md:gap-2 rounded-lg md:rounded-xl text-accent hover:text-accent hover:bg-accent/10 px-2 md:px-4 font-semibold';

type Story = StoryObj;

const createBudgetActions = (): HTMLElement => {
  const container = document.createElement('div');
  container.className =
    '-mx-4 border-y border-base-300 bg-base-100 px-4 py-2 md:mx-0 md:rounded-xl md:border md:shadow-sm md:p-4 lg:p-6 overflow-x-auto overflow-y-hidden';
  container.setAttribute('role', 'toolbar');
  container.setAttribute('aria-label', 'Budget actions');

  container.innerHTML = `
    <div class="flex items-center gap-1 md:gap-2 flex-nowrap">
      <button type="button" class="${accentGhostBtn}" aria-label="Set new budget">
        ${plusIcon}
        <span class="hidden sm:inline">New Budget</span>
        <span class="sm:hidden">New</span>
      </button>

      <a href="/budget/categories" class="${ghostBtn}" aria-label="Manage categories" title="Categories">
        ${tagsIcon}
        <span class="text-xs md:text-sm">Categories</span>
      </a>

      <button type="button" class="${ghostBtn}" aria-label="Import budgets from CSV" title="Import">
        ${uploadIcon}
        <span>Import</span>
      </button>

      <button type="button" class="${ghostBtn}" aria-label="Export budgets to CSV" title="Export">
        ${downloadIcon}
        <span>Export</span>
      </button>

      <button type="button" class="${ghostBtn}" aria-label="Initialize all budgets" title="Initialize All">
        ${zapIcon}
        <span>Initialize All</span>
      </button>
    </div>
  `;

  return container;
};

export const Default: Story = {
  render: () => createBudgetActions(),
};
