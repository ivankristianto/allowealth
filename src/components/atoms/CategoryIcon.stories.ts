import type { Meta, StoryObj } from '@storybook/html';

/**
 * CategoryIcon Component
 *
 * Displays a circular icon container with colored background for categories.
 * Used throughout the app to represent expense and income categories.
 */

const meta: Meta = {
  title: 'Components/Atoms/CategoryIcon',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Circular icon container for category display. Supports dynamic icon selection and color variants.',
      },
    },
  },
  argTypes: {
    icon: {
      control: 'select',
      options: [
        'home',
        'shopping-basket',
        'utensils',
        'car',
        'zap',
        'heart',
        'smile',
        'banknote',
        'trending-up',
        'tag',
      ],
      description: 'Lucide icon name (kebab-case)',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'tag' },
      },
    },
    color: {
      control: 'select',
      options: [
        'bg-red-500',
        'bg-blue-500',
        'bg-orange-500',
        'bg-purple-500',
        'bg-cyan-500',
        'bg-pink-500',
        'bg-emerald-500',
        'bg-indigo-500',
        'bg-slate-500',
      ],
      description: 'Tailwind background color class',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'bg-slate-500' },
      },
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Icon container size',
      table: {
        type: { summary: 'sm | md | lg' },
        defaultValue: { summary: 'md' },
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    icon: 'home',
    color: 'bg-red-500',
    size: 'md',
  },
  render: (args) => {
    const container = document.createElement('div');
    const iconContainer = document.createElement('div');

    const sizeClasses: Record<string, string> = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };

    const iconSizes: Record<string, number> = {
      sm: 16,
      md: 20,
      lg: 24,
    };

    iconContainer.className = [
      sizeClasses[args.size as string],
      'rounded-xl',
      args.color,
      'flex items-center justify-center text-white shadow-lg transition-transform',
    ].join(' ');

    // Create SVG icon dynamically (simplified for story)
    const iconSize = iconSizes[args.size as string];
    iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Category Icon</title><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;

    container.appendChild(iconContainer);
    return container;
  },
};

export const Small: Story = {
  args: {
    icon: 'shopping-basket',
    color: 'bg-blue-500',
    size: 'sm',
  },
  render: Default.render,
};

export const Large: Story = {
  args: {
    icon: 'utensils',
    color: 'bg-orange-500',
    size: 'lg',
  },
  render: Default.render,
};

export const ExpenseCategories: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex gap-4 flex-wrap';

    const categories = [
      { icon: 'home', color: 'bg-red-500', label: 'Housing' },
      { icon: 'shopping-basket', color: 'bg-blue-500', label: 'Groceries' },
      { icon: 'utensils', color: 'bg-orange-500', label: 'Dining' },
      { icon: 'car', color: 'bg-purple-500', label: 'Transport' },
      { icon: 'zap', color: 'bg-blue-600', label: 'Utilities' },
      { icon: 'smile', color: 'bg-pink-500', label: 'Entertainment' },
    ];

    categories.forEach(({ icon, color, label }) => {
      const item = document.createElement('div');
      item.className = 'flex flex-col items-center gap-2';

      const iconContainer = document.createElement('div');
      iconContainer.className = [
        'w-10 h-10',
        'rounded-xl',
        color,
        'flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110',
      ].join(' ');
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>${icon}</title><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;

      const labelEl = document.createElement('span');
      labelEl.className = 'text-sm font-medium dark:text-white';
      labelEl.textContent = label;

      item.appendChild(iconContainer);
      item.appendChild(labelEl);
      container.appendChild(item);
    });

    return container;
  },
};

export const IncomeCategories: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex gap-4 flex-wrap';

    const categories = [
      { icon: 'banknote', color: 'bg-emerald-500', label: 'Salary' },
      { icon: 'trending-up', color: 'bg-emerald-400', label: 'Dividend' },
      { icon: 'palette', color: 'bg-indigo-500', label: 'Freelance' },
    ];

    categories.forEach(({ icon, color, label }) => {
      const item = document.createElement('div');
      item.className = 'flex flex-col items-center gap-2';

      const iconContainer = document.createElement('div');
      iconContainer.className = [
        'w-10 h-10',
        'rounded-xl',
        color,
        'flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110',
      ].join(' ');
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>${icon}</title><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;

      const labelEl = document.createElement('span');
      labelEl.className = 'text-sm font-medium dark:text-white';
      labelEl.textContent = label;

      item.appendChild(iconContainer);
      item.appendChild(labelEl);
      container.appendChild(item);
    });

    return container;
  },
};
