import type { Meta, StoryObj } from '@storybook/html';

/**
 * TabToggle Component
 *
 * Pill-style toggle button group for switching between two options.
 * Commonly used for filtering content like Expense/Income categories.
 */

const meta: Meta = {
  title: 'Components/Atoms/TabToggle',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A pill-style toggle button group with active state highlighting. Used for binary filters like Expense/Income or Active/Inactive.',
      },
    },
  },
  argTypes: {
    activeTab: {
      control: 'radio',
      options: ['expense', 'income'],
      description: 'Currently active tab value',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'expense' },
      },
    },
    option1Label: {
      control: 'text',
      description: 'Label for first option',
      table: {
        type: { summary: 'string' },
      },
    },
    option2Label: {
      control: 'text',
      description: 'Label for second option',
      table: {
        type: { summary: 'string' },
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    activeTab: 'expense',
    option1Label: 'Expense',
    option2Label: 'Income',
  },
  render: (args) => {
    const container = document.createElement('div');
    container.className = 'flex bg-base-200 p-1.5 rounded-2xl w-full md:w-auto';

    const button1 = document.createElement('button');
    button1.type = 'button';
    button1.className = [
      'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
      args.activeTab === 'expense'
        ? 'bg-base-100 shadow-md text-primary'
        : 'text-base-content/60 hover:text-base-content/80',
    ].join(' ');
    button1.textContent = args.option1Label as string;

    const button2 = document.createElement('button');
    button2.type = 'button';
    button2.className = [
      'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
      args.activeTab === 'income'
        ? 'bg-base-100 shadow-md text-primary'
        : 'text-base-content/60 hover:text-base-content/80',
    ].join(' ');
    button2.textContent = args.option2Label as string;

    // Add click handlers to toggle active state
    button1.addEventListener('click', () => {
      button1.className = [
        'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
        'bg-base-100 shadow-md text-primary',
      ].join(' ');
      button2.className = [
        'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
        'text-base-content/60 hover:text-base-content/80',
      ].join(' ');
    });

    button2.addEventListener('click', () => {
      button2.className = [
        'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
        'bg-base-100 shadow-md text-primary',
      ].join(' ');
      button1.className = [
        'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
        'text-base-content/60 hover:text-base-content/80',
      ].join(' ');
    });

    container.appendChild(button1);
    container.appendChild(button2);
    return container;
  },
};

export const ExpenseActive: Story = {
  args: {
    activeTab: 'expense',
    option1Label: 'Expense',
    option2Label: 'Income',
  },
  render: Default.render,
};

export const IncomeActive: Story = {
  args: {
    activeTab: 'income',
    option1Label: 'Expense',
    option2Label: 'Income',
  },
  render: Default.render,
};

export const CustomLabels: Story = {
  args: {
    activeTab: 'active',
    option1Label: 'Active',
    option2Label: 'Inactive',
  },
  render: (args) => {
    const container = document.createElement('div');
    container.className = 'flex bg-base-200 p-1.5 rounded-2xl w-full md:w-auto';

    const button1 = document.createElement('button');
    button1.type = 'button';
    button1.className = [
      'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
      args.activeTab === 'active'
        ? 'bg-base-100 shadow-md text-primary'
        : 'text-base-content/60 hover:text-base-content/80',
    ].join(' ');
    button1.textContent = args.option1Label as string;

    const button2 = document.createElement('button');
    button2.type = 'button';
    button2.className = [
      'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
      args.activeTab === 'inactive'
        ? 'bg-base-100 shadow-md text-primary'
        : 'text-base-content/60 hover:text-base-content/80',
    ].join(' ');
    button2.textContent = args.option2Label as string;

    button1.addEventListener('click', () => {
      button1.className = [
        'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
        'bg-base-100 shadow-md text-primary',
      ].join(' ');
      button2.className = [
        'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
        'text-base-content/60 hover:text-base-content/80',
      ].join(' ');
    });

    button2.addEventListener('click', () => {
      button2.className = [
        'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
        'bg-base-100 shadow-md text-primary',
      ].join(' ');
      button1.className = [
        'flex-1 md:w-40 py-2.5 text-sm font-bold rounded-xl transition-all',
        'text-base-content/60 hover:text-base-content/80',
      ].join(' ');
    });

    container.appendChild(button1);
    container.appendChild(button2);
    return container;
  },
};

export const MobileView: Story = {
  args: {
    activeTab: 'expense',
    option1Label: 'Expense',
    option2Label: 'Income',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: Default.render,
};
