import type { Meta, StoryObj } from '@storybook/html';
import { chevronLeftIcon, chevronRightIcon } from '@/stories/icons';

interface BudgetPageHeaderArgs {
  title?: string;
  subtitle?: string;
  budgetCount?: number;
  currentMonth: string;
  prevMonthUrl: string;
  nextMonthUrl?: string;
  isNextDisabled?: boolean;
  showAiRebalancer?: boolean;
}

const meta: Meta<BudgetPageHeaderArgs> = {
  title: 'Organisms/BudgetPageHeader',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Main heading',
    },
    subtitle: {
      control: 'text',
      description: 'Description text (auto-generated if not provided)',
    },
    budgetCount: {
      control: 'number',
      description: 'Number of budget categories being tracked',
    },
    currentMonth: {
      control: 'text',
      description: 'Display name for current month',
    },
    prevMonthUrl: {
      control: 'text',
      description: 'URL for previous month navigation',
    },
    nextMonthUrl: {
      control: 'text',
      description: 'URL for next month navigation',
    },
    isNextDisabled: {
      control: 'boolean',
      description: 'Disable next month button',
    },
    showAiRebalancer: {
      control: 'boolean',
      description: 'Show AI Rebalancer button',
    },
  },
};

export default meta;

// HTML escape helper to prevent XSS
const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Attribute escape helper (also escapes quotes)
const escapeAttr = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// Validate URL is safe (relative or same-origin)
const isSafeUrl = (url: string): boolean => {
  if (!url) return false;
  // Allow relative URLs starting with /
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
};

// SVG icons (aria-hidden for decorative icons per design system accessibility guidelines)
// chevronLeftIcon and chevronRightIcon imported from @/stories/icons
const sparklesIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`;
const historyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`;

type Story = StoryObj<BudgetPageHeaderArgs>;

const createBudgetPageHeader = (args: BudgetPageHeaderArgs): HTMLElement => {
  const {
    title = 'Family Spending Targets',
    subtitle,
    budgetCount = 0,
    currentMonth,
    prevMonthUrl,
    nextMonthUrl,
    isNextDisabled = false,
    showAiRebalancer = true,
  } = args;

  // Generate dynamic subtitle if not provided (escape user input)
  const displaySubtitle = subtitle
    ? escapeHtml(subtitle)
    : budgetCount > 0
      ? `Monitoring ${budgetCount} critical expense ${budgetCount === 1 ? 'category' : 'categories'} for our household.`
      : 'Set up spending limits to track your budget.';

  // Validate and escape URLs
  const safePrevUrl = isSafeUrl(prevMonthUrl) ? escapeAttr(prevMonthUrl) : '#';
  const safeNextUrl = nextMonthUrl && isSafeUrl(nextMonthUrl) ? escapeAttr(nextMonthUrl) : '';

  const container = document.createElement('header');
  container.className =
    'flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6';

  const nextMonthButton =
    safeNextUrl && !isNextDisabled
      ? `<a href="${safeNextUrl}" class="btn btn-sm btn-square bg-base-100 border border-base-300 hover:border-accent/30 hover:text-accent rounded-xl transition-all" aria-label="Next month">${chevronRightIcon}</a>`
      : `<button type="button" class="btn btn-sm btn-square bg-base-100 border border-base-300 rounded-xl opacity-30 cursor-not-allowed" disabled aria-label="Next month (disabled)">${chevronRightIcon}</button>`;

  container.innerHTML = `
    <!-- Title and subtitle -->
    <div>
      <h1 class="text-2xl font-bold text-base-content tracking-tight leading-none">${escapeHtml(title)}</h1>
      <p class="text-sm text-base-content/60 mt-2 font-medium">${displaySubtitle}</p>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- View History Button -->
      <a href="/budget/history" class="btn btn-outline gap-2 rounded-2xl border border-base-300 hover:border-accent/30 hover:text-accent hover:bg-transparent" aria-label="View budget history">
        ${historyIcon}
        <span>View History</span>
      </a>

      <!-- AI Rebalancer Button -->
      ${
        showAiRebalancer
          ? `
        <button type="button" class="btn btn-accent gap-2 rounded-2xl shadow-md hover:shadow-lg transition-all" aria-label="Open AI budget rebalancer">
          ${sparklesIcon}
          <span>AI Rebalancer</span>
        </button>
      `
          : ''
      }

      <!-- Month Navigation -->
      <div class="flex items-center gap-1">
        <a href="${safePrevUrl}" class="btn btn-sm btn-square bg-base-100 border border-base-300 hover:border-accent/30 hover:text-accent rounded-xl transition-all" aria-label="Previous month">
          ${chevronLeftIcon}
        </a>

        <div class="px-4 py-2 bg-base-100 border border-base-300 rounded-xl text-sm font-bold text-base-content min-w-[130px] text-center">
          ${escapeHtml(currentMonth)}
        </div>

        ${nextMonthButton}
      </div>

      <!-- Set New Budget Button -->
      <button type="button" class="btn btn-outline btn-accent gap-2 rounded-2xl border-2 hover:bg-accent/5" aria-label="Set new budget">
        <span>Set New Budget</span>
      </button>
    </div>
  `;

  return container;
};

export const Default: Story = {
  args: {
    title: 'Family Spending Targets',
    subtitle: '',
    budgetCount: 6,
    currentMonth: 'January 2024',
    prevMonthUrl: '/budget?month=2023-12',
    nextMonthUrl: '',
    isNextDisabled: true,
    showAiRebalancer: true,
  },
  render: (args) => createBudgetPageHeader(args),
};

export const WithNavigation: Story = {
  args: {
    title: 'Family Spending Targets',
    subtitle: '',
    budgetCount: 8,
    currentMonth: 'December 2023',
    prevMonthUrl: '/budget?month=2023-11',
    nextMonthUrl: '/budget?month=2024-01',
    isNextDisabled: false,
    showAiRebalancer: true,
  },
  render: (args) => createBudgetPageHeader(args),
};

export const NoAiRebalancer: Story = {
  args: {
    title: 'Family Spending Targets',
    subtitle: '',
    budgetCount: 4,
    currentMonth: 'January 2024',
    prevMonthUrl: '/budget?month=2023-12',
    nextMonthUrl: '',
    isNextDisabled: true,
    showAiRebalancer: false,
  },
  render: (args) => createBudgetPageHeader(args),
};

export const CustomSubtitle: Story = {
  args: {
    title: 'Family Spending Targets',
    subtitle: 'Track your monthly spending across all categories.',
    budgetCount: 0,
    currentMonth: 'January 2024',
    prevMonthUrl: '/budget?month=2023-12',
    nextMonthUrl: '',
    isNextDisabled: true,
    showAiRebalancer: true,
  },
  render: (args) => createBudgetPageHeader(args),
};

export const NoBudgets: Story = {
  args: {
    title: 'Family Spending Targets',
    subtitle: '',
    budgetCount: 0,
    currentMonth: 'January 2024',
    prevMonthUrl: '/budget?month=2023-12',
    nextMonthUrl: '',
    isNextDisabled: true,
    showAiRebalancer: true,
  },
  render: (args) => createBudgetPageHeader(args),
};

export const SingleBudget: Story = {
  args: {
    title: 'Family Spending Targets',
    subtitle: '',
    budgetCount: 1,
    currentMonth: 'January 2024',
    prevMonthUrl: '/budget?month=2023-12',
    nextMonthUrl: '',
    isNextDisabled: true,
    showAiRebalancer: true,
  },
  render: (args) => createBudgetPageHeader(args),
};
