/**
 * BudgetActions Stories
 *
 * Note: History and Copy buttons are now in BudgetPageHeader (left of month picker).
 * BudgetActions contains: Categories, Import, Export, AI Rebalancer, New Budget.
 */
import type { Meta, StoryObj } from '@storybook/html';

interface BudgetActionsArgs {
  showAiRebalancer?: boolean;
}

const meta: Meta<BudgetActionsArgs> = {
  title: 'Molecules/BudgetActions',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    showAiRebalancer: {
      control: 'boolean',
      description: 'Show AI Rebalancer button',
    },
  },
};

export default meta;

// SVG icons (aria-hidden for decorative icons per design system accessibility guidelines)
const tagsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/><path d="M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="6.5" cy="9.5" r=".5" fill="currentColor"/></svg>`;
const uploadIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`;
const downloadIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`;
const sparklesIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`;
const plusIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

type Story = StoryObj<BudgetActionsArgs>;

const ghostBtn =
  'btn btn-ghost btn-sm md:btn-md gap-1 md:gap-2 rounded-lg md:rounded-xl text-base-content/70 hover:text-base-content hover:bg-base-200 px-2 md:px-4';
const accentGhostBtn =
  'btn btn-ghost btn-sm md:btn-md gap-1 md:gap-2 rounded-lg md:rounded-xl text-accent hover:text-accent hover:bg-accent/10 px-2 md:px-4 font-semibold';

const createBudgetActions = (args: BudgetActionsArgs): HTMLElement => {
  const { showAiRebalancer = true } = args;

  const container = document.createElement('div');
  container.className =
    'flex flex-wrap items-center gap-1 md:gap-2 bg-base-100 rounded-2xl border border-base-300 shadow-sm px-3 py-2 md:px-4 md:py-3';
  container.setAttribute('role', 'toolbar');
  container.setAttribute('aria-label', 'Budget actions');

  container.innerHTML = `
    <div class="flex items-center gap-1 md:gap-2">
      <!-- Categories -->
      <a href="/budget/categories" class="${ghostBtn}" aria-label="Manage categories" title="Categories">
        ${tagsIcon}
        <span class="hidden md:inline">Categories</span>
      </a>

      <!-- Import -->
      <button type="button" class="${ghostBtn}" aria-label="Import budgets from CSV" title="Import">
        ${uploadIcon}
        <span>Import</span>
      </button>

      <!-- Export -->
      <button type="button" class="${ghostBtn}" aria-label="Export budgets to CSV" title="Export">
        ${downloadIcon}
        <span>Export</span>
      </button>

      <!-- AI Rebalancer -->
      ${
        showAiRebalancer
          ? `
        <button type="button" class="btn btn-ghost btn-sm md:btn-md gap-1 md:gap-2 rounded-lg md:rounded-xl text-accent hover:text-accent hover:bg-accent/10 px-2 md:px-4" aria-label="AI budget rebalancer" title="AI Rebalancer">
          ${sparklesIcon}
          <span class="hidden md:inline">AI Rebalancer</span>
        </button>
      `
          : ''
      }
    </div>

    <!-- Primary Action - New Budget -->
    <div class="ml-auto">
      <button type="button" class="${accentGhostBtn}" aria-label="Set new budget">
        ${plusIcon}
        <span class="hidden sm:inline">New Budget</span>
        <span class="sm:hidden">New</span>
      </button>
    </div>
  `;

  return container;
};

export const Default: Story = {
  args: {
    showAiRebalancer: true,
  },
  render: (args) => createBudgetActions(args),
};

export const WithoutAiRebalancer: Story = {
  args: {
    showAiRebalancer: false,
  },
  render: (args) => createBudgetActions(args),
};
