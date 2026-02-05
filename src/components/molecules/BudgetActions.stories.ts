/**
 * P2 TODO: This stories file is out of sync with the actual component.
 * Updates needed:
 * - Change btn-outline to btn-ghost for secondary buttons
 * - Change rounded-2xl to rounded-xl
 * - Add Categories button
 * - Add card styling wrapper (bg-base-100, rounded-card, border, shadow, padding)
 * - Update button labels ("History" not "View History", "New Budget" not "Set New Budget")
 * - Add AI Rebalancer modal story
 */
import type { Meta, StoryObj } from '@storybook/html';

interface BudgetActionsArgs {
  showAiRebalancer?: boolean;
  showCopyButton?: boolean;
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
    showCopyButton: {
      control: 'boolean',
      description: 'Show Copy to Next Month button',
    },
  },
};

export default meta;

// SVG icons (aria-hidden for decorative icons per design system accessibility guidelines)
const historyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`;
const sparklesIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`;
const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const plusIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

type Story = StoryObj<BudgetActionsArgs>;

const createBudgetActions = (args: BudgetActionsArgs): HTMLElement => {
  const { showAiRebalancer = true, showCopyButton = false } = args;

  const container = document.createElement('div');
  container.className = 'flex flex-wrap items-center gap-3';

  container.innerHTML = `
    <!-- View History Button -->
    <a href="/budget/history" class="btn btn-outline gap-2 rounded-2xl border border-base-300 hover:border-accent/30 hover:text-accent hover:bg-transparent" aria-label="View budget history">
      ${historyIcon}
      <span>View History</span>
    </a>

    <!-- AI Rebalancer Button -->
    ${
      showAiRebalancer
        ? `
      <button type="button" class="btn btn-outline btn-accent gap-2 rounded-2xl shadow-md hover:shadow-lg transition-all" aria-label="AI budget rebalancer">
        ${sparklesIcon}
        <span>AI Rebalancer</span>
      </button>
    `
        : ''
    }

    <!-- Copy to Next Month Button -->
    ${
      showCopyButton
        ? `
      <button type="button" class="btn btn-outline gap-2 rounded-2xl border border-base-300 hover:border-accent/30 hover:text-accent hover:bg-transparent" aria-label="Copy budgets to next month">
        ${copyIcon}
        <span>Copy to Next Month</span>
      </button>
    `
        : ''
    }

    <!-- Set New Budget Button -->
    <button type="button" class="btn btn-accent rounded-2xl font-bold text-sm flex items-center gap-2" aria-label="Set new budget">
      ${plusIcon}
      <span>Set New Budget</span>
    </button>
  `;

  return container;
};

export const Default: Story = {
  args: {
    showAiRebalancer: true,
    showCopyButton: false,
  },
  render: (args) => createBudgetActions(args),
};

export const WithCopyButton: Story = {
  args: {
    showAiRebalancer: true,
    showCopyButton: true,
  },
  render: (args) => createBudgetActions(args),
};

export const NoBudgets: Story = {
  args: {
    showAiRebalancer: false,
    showCopyButton: false,
  },
  render: (args) => createBudgetActions(args),
};

export const AllButtons: Story = {
  args: {
    showAiRebalancer: true,
    showCopyButton: true,
  },
  render: (args) => createBudgetActions(args),
};

export const OnlyCopyButton: Story = {
  args: {
    showAiRebalancer: false,
    showCopyButton: true,
  },
  render: (args) => createBudgetActions(args),
};
