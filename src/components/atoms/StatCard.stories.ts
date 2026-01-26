import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { TrendingUp, TrendingDown } = IconRenderers;

/**
 * StatCard Component Stories
 *
 * Metric display card with optional subtitle, icon, and progress bar.
 * Used for displaying financial summaries and statistics.
 *
 * @see src/components/atoms/StatCard.astro - Component implementation
 */

const meta: Meta = {
  title: 'Atoms/StatCard',
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Card title (uppercase label)',
    },
    value: {
      control: 'text',
      description: 'Main value to display',
    },
    subtitle: {
      control: 'text',
      description: 'Optional subtitle text',
    },
    subtitleIcon: {
      control: 'select',
      options: ['trending-up', 'trending-down', 'none'],
      description: 'Optional icon for subtitle (Lucide icon name)',
    },
    valueColor: {
      control: 'text',
      description: 'Tailwind class for value color (e.g., "text-success")',
    },
    subtitleColor: {
      control: 'text',
      description: 'Tailwind class for subtitle color',
    },
    progress: {
      control: 'number',
      description: 'Progress percentage (0-100+)',
    },
    progressColor: {
      control: 'text',
      description: 'Tailwind class for progress bar color (e.g., "bg-success")',
    },
  },
};

export default meta;

interface StatCardArgs {
  title: string;
  value: string;
  subtitle?: string;
  subtitleIcon?: string;
  valueColor?: string;
  subtitleColor?: string;
  progress?: number;
  progressColor?: string;
}

const createStatCard = (args: StatCardArgs): HTMLElement => {
  const {
    title,
    value,
    subtitle,
    subtitleIcon,
    valueColor = 'text-base-content',
    subtitleColor = 'text-base-content/60',
    progress,
    progressColor = 'bg-primary',
  } = args;

  const card = document.createElement('div');
  card.className =
    'bg-base-100 rounded-3xl border border-base-300 shadow-sm p-6 flex flex-col gap-3';

  // Title
  const titleEl = document.createElement('div');
  titleEl.className =
    'label-premium text-xs tracking-widest text-base-content/60 uppercase font-semibold';
  titleEl.textContent = title;
  card.appendChild(titleEl);

  // Value
  const valueEl = document.createElement('div');
  valueEl.className = `text-2xl md:text-3xl font-bold leading-none tracking-tight ${valueColor}`;
  valueEl.textContent = value;
  card.appendChild(valueEl);

  // Subtitle with optional icon
  if (subtitle) {
    const subtitleContainer = document.createElement('div');
    subtitleContainer.className = 'flex items-center gap-2';

    if (subtitleIcon && subtitleIcon !== 'none') {
      const iconWrapper = document.createElement('div');
      iconWrapper.className = subtitleColor;

      if (subtitleIcon === 'trending-up') {
        iconWrapper.appendChild(TrendingUp.render({ size: 14 }, { 'aria-hidden': 'true' }));
      } else if (subtitleIcon === 'trending-down') {
        iconWrapper.appendChild(TrendingDown.render({ size: 14 }, { 'aria-hidden': 'true' }));
      }

      subtitleContainer.appendChild(iconWrapper);
    }

    const subtitleText = document.createElement('span');
    subtitleText.className = `text-xs font-medium ${subtitleColor}`;
    subtitleText.textContent = subtitle;
    subtitleContainer.appendChild(subtitleText);

    card.appendChild(subtitleContainer);
  }

  // Progress bar
  if (progress !== undefined) {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'w-full bg-base-300 rounded-full h-2 overflow-hidden';

    const progressBar = document.createElement('div');
    progressBar.className = `h-full ${progressColor} transition-all duration-300`;
    progressBar.style.width = `${Math.min(progress, 100)}%`;
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-valuenow', progress.toString());
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');

    progressContainer.appendChild(progressBar);
    card.appendChild(progressContainer);
  }

  return card;
};

// Default - Simple stat card
export const Default: StoryObj = {
  args: {
    title: 'TOTAL INCOME',
    value: 'Rp 9.750.000',
  },
  render: (args) => createStatCard(args as StatCardArgs),
};

// With subtitle and icon - Success color
export const WithSubtitleAndIcon: StoryObj = {
  args: {
    title: 'TOTAL INCOME',
    value: 'Rp 9.750.000',
    subtitle: 'PERIOD TOTAL',
    subtitleIcon: 'trending-up',
    valueColor: 'text-success',
    subtitleColor: 'text-success/60',
  },
  render: (args) => createStatCard(args as StatCardArgs),
};

// Expenses - Error color
export const Expenses: StoryObj = {
  args: {
    title: 'TOTAL EXPENSES',
    value: 'Rp 4.735.000',
    subtitle: '6 CATEGORIES',
    valueColor: 'text-error',
    subtitleColor: 'text-error/60',
  },
  render: (args) => createStatCard(args as StatCardArgs),
};

// Net Savings - Accent color
export const NetSavings: StoryObj = {
  args: {
    title: 'NET SAVINGS',
    value: 'Rp 5.015.000',
    subtitle: 'RETAINED CAPITAL',
    valueColor: 'text-accent',
    subtitleColor: 'text-base-content/60',
  },
  render: (args) => createStatCard(args as StatCardArgs),
};

// With progress bar - Success
export const WithProgressBarSuccess: StoryObj = {
  args: {
    title: 'BUDGET HEALTH',
    value: '8%',
    progress: 8,
    progressColor: 'bg-success',
    valueColor: 'text-success',
  },
  render: (args) => createStatCard(args as StatCardArgs),
};

// With progress bar - Over budget
export const WithProgressBarOverBudget: StoryObj = {
  args: {
    title: 'BUDGET HEALTH',
    value: '125%',
    progress: 125,
    progressColor: 'bg-error',
    valueColor: 'text-error',
  },
  render: (args) => createStatCard(args as StatCardArgs),
};

// With progress bar at 100%
export const WithProgressBarAtLimit: StoryObj = {
  args: {
    title: 'BUDGET HEALTH',
    value: '100%',
    progress: 100,
    progressColor: 'bg-warning',
    valueColor: 'text-warning',
  },
  render: (args) => createStatCard(args as StatCardArgs),
};

// All Variants Grid
export const AllVariants: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6';

    const variants = [
      {
        title: 'TOTAL INCOME',
        value: 'Rp 9.750.000',
        subtitle: 'PERIOD TOTAL',
        subtitleIcon: 'trending-up',
        valueColor: 'text-success',
        subtitleColor: 'text-success/60',
      },
      {
        title: 'TOTAL EXPENSES',
        value: 'Rp 4.735.000',
        subtitle: '6 CATEGORIES',
        valueColor: 'text-error',
        subtitleColor: 'text-error/60',
      },
      {
        title: 'NET SAVINGS',
        value: 'Rp 5.015.000',
        subtitle: 'RETAINED CAPITAL',
        valueColor: 'text-accent',
        subtitleColor: 'text-base-content/60',
      },
      {
        title: 'BUDGET HEALTH',
        value: '8%',
        progress: 8,
        progressColor: 'bg-success',
        valueColor: 'text-success',
      },
    ];

    variants.forEach((variant) => {
      container.appendChild(createStatCard(variant));
    });

    return container;
  },
};

// Dark mode comparison
export const DarkModeComparison: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    // Light mode
    const lightSection = document.createElement('section');
    lightSection.setAttribute('data-theme', 'light');
    lightSection.className = 'p-6 bg-base-200 rounded-lg';

    const lightTitle = document.createElement('h3');
    lightTitle.className = 'text-lg font-semibold mb-4';
    lightTitle.textContent = 'Light Mode';
    lightSection.appendChild(lightTitle);

    const lightGrid = document.createElement('div');
    lightGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    lightGrid.appendChild(
      createStatCard({
        title: 'TOTAL INCOME',
        value: 'Rp 9.750.000',
        subtitle: 'PERIOD TOTAL',
        subtitleIcon: 'trending-up',
        valueColor: 'text-success',
        subtitleColor: 'text-success/60',
      })
    );
    lightGrid.appendChild(
      createStatCard({
        title: 'BUDGET HEALTH',
        value: '8%',
        progress: 8,
        progressColor: 'bg-success',
        valueColor: 'text-success',
      })
    );
    lightSection.appendChild(lightGrid);
    container.appendChild(lightSection);

    // Dark mode
    const darkSection = document.createElement('section');
    darkSection.setAttribute('data-theme', 'dark');
    darkSection.className = 'p-6 bg-base-200 rounded-lg';

    const darkTitle = document.createElement('h3');
    darkTitle.className = 'text-lg font-semibold mb-4';
    darkTitle.textContent = 'Dark Mode';
    darkSection.appendChild(darkTitle);

    const darkGrid = document.createElement('div');
    darkGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    darkGrid.appendChild(
      createStatCard({
        title: 'TOTAL INCOME',
        value: 'Rp 9.750.000',
        subtitle: 'PERIOD TOTAL',
        subtitleIcon: 'trending-up',
        valueColor: 'text-success',
        subtitleColor: 'text-success/60',
      })
    );
    darkGrid.appendChild(
      createStatCard({
        title: 'BUDGET HEALTH',
        value: '8%',
        progress: 8,
        progressColor: 'bg-success',
        valueColor: 'text-success',
      })
    );
    darkSection.appendChild(darkGrid);
    container.appendChild(darkSection);

    return container;
  },
};
