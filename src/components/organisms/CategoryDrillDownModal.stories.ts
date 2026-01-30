/**
 * CategoryDrillDownModal Storybook Stories
 *
 * NOTE: This file demonstrates the modal with trigger buttons that dispatch custom events.
 * The actual modal is rendered as an Astro component and opened via the 'open-category-drilldown' event.
 *
 * @see src/components/organisms/CategoryDrillDownModal.astro
 */
import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Organisms/CategoryDrillDownModal',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Modal for viewing detailed transactions and spending analysis for a category. Opens via custom event "open-category-drilldown".',
      },
    },
  },
};

export default meta;

// Helper to create trigger button
const createTriggerButton = (data: {
  categoryId: string;
  categoryName: string;
  spent: number;
  budgetLimit?: number | null;
  categoryIcon?: string;
  categoryColor?: string;
  period: string;
}): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'p-6 bg-base-100 rounded-3xl border border-base-300';

  // Category info display
  const info = document.createElement('div');
  info.className = 'mb-4';
  info.innerHTML = `
    <div class="flex items-center gap-3 mb-3">
      <div class="${data.categoryColor || 'bg-primary/10'} w-10 h-10 rounded-xl flex items-center justify-center">
        <span class="text-lg font-bold">${data.categoryIcon || data.categoryName.charAt(0)}</span>
      </div>
      <div>
        <div class="font-bold text-lg">${data.categoryName}</div>
        <div class="text-sm text-base-content/60">${data.period}</div>
      </div>
    </div>
    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-base-content/60">Spent:</span>
        <span class="font-bold">${formatCurrency(data.spent)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-base-content/60">Budget:</span>
        <span class="font-bold">${data.budgetLimit ? formatCurrency(data.budgetLimit) : 'Not Set'}</span>
      </div>
    </div>
  `;
  container.appendChild(info);

  // Trigger button
  const button = document.createElement('button');
  button.className = 'w-full btn btn-accent rounded-xl font-bold uppercase tracking-widest text-xs';
  button.textContent = 'View Details';

  button.addEventListener('click', () => {
    const event = new CustomEvent('open-category-drilldown', {
      detail: data,
    });
    document.dispatchEvent(event);
  });

  container.appendChild(button);

  // Note about modal
  const note = document.createElement('p');
  note.className = 'mt-4 text-xs text-base-content/50 italic text-center';
  note.textContent = 'Click button to open modal (requires modal to be present in DOM)';
  container.appendChild(note);

  return container;
};

// Healthy category (< 80% budget)
export const HealthyCategory: StoryObj = {
  render: () =>
    createTriggerButton({
      categoryId: '1',
      categoryName: 'Utilities',
      spent: 1850000,
      budgetLimit: 4000000,
      categoryIcon: 'U',
      categoryColor: 'bg-primary/10',
      period: 'February 2024',
    }),
};

// Warning category (>= 80% budget)
export const WarningCategory: StoryObj = {
  render: () =>
    createTriggerButton({
      categoryId: '2',
      categoryName: 'Transport',
      spent: 3600000,
      budgetLimit: 4000000,
      categoryIcon: 'T',
      categoryColor: 'bg-warning/10',
      period: 'February 2024',
    }),
};

// Over budget category (> 100% budget)
export const OverBudgetCategory: StoryObj = {
  render: () =>
    createTriggerButton({
      categoryId: '3',
      categoryName: 'Dining',
      spent: 4500000,
      budgetLimit: 3000000,
      categoryIcon: 'D',
      categoryColor: 'bg-error/10',
      period: 'February 2024',
    }),
};

// Untracked category (no budget set)
export const UntrackedCategory: StoryObj = {
  render: () =>
    createTriggerButton({
      categoryId: '4',
      categoryName: 'Health',
      spent: 750000,
      budgetLimit: null,
      categoryIcon: 'H',
      categoryColor: 'bg-accent/10',
      period: 'February 2024',
    }),
};

// High spending category
export const HighSpendingCategory: StoryObj = {
  render: () =>
    createTriggerButton({
      categoryId: '5',
      categoryName: 'Groceries',
      spent: 5250000,
      budgetLimit: 8000000,
      categoryIcon: 'G',
      categoryColor: 'bg-success/10',
      period: 'February 2024',
    }),
};

// Low spending category
export const LowSpendingCategory: StoryObj = {
  render: () =>
    createTriggerButton({
      categoryId: '6',
      categoryName: 'Entertainment',
      spent: 250000,
      budgetLimit: 1500000,
      categoryIcon: 'E',
      categoryColor: 'bg-secondary/10',
      period: 'February 2024',
    }),
};

// All scenarios together
export const AllScenarios: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

    const scenarios = [
      {
        title: 'Healthy (46% used)',
        data: {
          categoryId: '1',
          categoryName: 'Utilities',
          spent: 1850000,
          budgetLimit: 4000000,
          categoryIcon: 'U',
          categoryColor: 'bg-primary/10',
          period: 'February 2024',
        },
      },
      {
        title: 'Warning (90% used)',
        data: {
          categoryId: '2',
          categoryName: 'Transport',
          spent: 3600000,
          budgetLimit: 4000000,
          categoryIcon: 'T',
          categoryColor: 'bg-warning/10',
          period: 'February 2024',
        },
      },
      {
        title: 'Over Budget (150% used)',
        data: {
          categoryId: '3',
          categoryName: 'Dining',
          spent: 4500000,
          budgetLimit: 3000000,
          categoryIcon: 'D',
          categoryColor: 'bg-error/10',
          period: 'February 2024',
        },
      },
      {
        title: 'Untracked (no budget)',
        data: {
          categoryId: '4',
          categoryName: 'Health',
          spent: 750000,
          budgetLimit: null,
          categoryIcon: 'H',
          categoryColor: 'bg-accent/10',
          period: 'February 2024',
        },
      },
      {
        title: 'High Spending',
        data: {
          categoryId: '5',
          categoryName: 'Groceries',
          spent: 5250000,
          budgetLimit: 8000000,
          categoryIcon: 'G',
          categoryColor: 'bg-success/10',
          period: 'February 2024',
        },
      },
      {
        title: 'Low Spending',
        data: {
          categoryId: '6',
          categoryName: 'Entertainment',
          spent: 250000,
          budgetLimit: 1500000,
          categoryIcon: 'E',
          categoryColor: 'bg-secondary/10',
          period: 'February 2024',
        },
      },
    ];

    scenarios.forEach((scenario) => {
      const section = document.createElement('div');

      const title = document.createElement('h3');
      title.className = 'text-sm font-bold text-base-content/60 uppercase tracking-widest mb-3';
      title.textContent = scenario.title;
      section.appendChild(title);

      section.appendChild(createTriggerButton(scenario.data));
      container.appendChild(section);
    });

    return container;
  },
};

// Dark mode comparison
export const DarkModeComparison: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    const data = {
      categoryId: '1',
      categoryName: 'Utilities',
      spent: 1850000,
      budgetLimit: 4000000,
      categoryIcon: 'U',
      categoryColor: 'bg-primary/10',
      period: 'February 2024',
    };

    // Light mode
    const lightSection = document.createElement('section');
    lightSection.setAttribute('data-theme', 'light');
    lightSection.className = 'p-6 bg-base-200 rounded-lg';

    const lightTitle = document.createElement('h3');
    lightTitle.className = 'text-lg font-semibold mb-4';
    lightTitle.textContent = 'Light Mode';
    lightSection.appendChild(lightTitle);

    lightSection.appendChild(createTriggerButton(data));
    container.appendChild(lightSection);

    // Dark mode
    const darkSection = document.createElement('section');
    darkSection.setAttribute('data-theme', 'dark');
    darkSection.className = 'p-6 bg-base-200 rounded-lg';

    const darkTitle = document.createElement('h3');
    darkTitle.className = 'text-lg font-semibold mb-4';
    darkTitle.textContent = 'Dark Mode';
    darkSection.appendChild(darkTitle);

    darkSection.appendChild(createTriggerButton(data));
    container.appendChild(darkSection);

    return container;
  },
};
