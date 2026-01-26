import type { Meta, StoryObj } from '@storybook/html';
import { TrendingUp, House, PiggyBank } from '@lucide/astro';

const meta: Meta = {
  title: 'Molecules/TabSwitcher',
  tags: ['autodocs'],
  argTypes: {
    activeTab: {
      control: 'select',
      options: ['compound', 'loan', 'savings'],
      description: 'Currently active tab ID',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;

/**
 * Helper function to render Lucide icon
 */
function renderIcon(iconName: string): string {
  const icons: Record<string, { component: typeof TrendingUp; size: number }> = {
    trending_up: { component: TrendingUp, size: 18 },
    home: { component: House, size: 18 },
    piggy_bank: { component: PiggyBank, size: 18 },
  };
  const icon = icons[iconName];
  return icon.component.render({ size: icon.size, class: 'stroke-current' });
}

/**
 * Helper function to create TabSwitcher
 */
function createTabSwitcher(args: { activeTab?: string; className?: string }): HTMLElement {
  const { activeTab = 'compound', className = '' } = args;

  const tabs = [
    { id: 'compound', label: 'Compound Interest', icon: 'trending_up' },
    { id: 'loan', label: 'Loan & Mortgage', icon: 'home' },
    { id: 'savings', label: 'Savings Goal', icon: 'piggy_bank' },
  ];

  const container = document.createElement('div');
  container.className = ['tabs bg-base-200 p-1.5 rounded-2xl max-w-2xl', className].join(' ');
  container.setAttribute('role', 'tablist');
  container.setAttribute('data-tabs', '');

  tabs.forEach((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.role = 'tab';
    button.setAttribute('aria-selected', activeTab === tab.id ? 'true' : 'false');
    button.setAttribute('aria-controls', `${tab.id}-panel`);
    button.id = `${tab.id}-tab`;
    button.setAttribute('data-tab-id', tab.id);

    const isActive = activeTab === tab.id;
    button.className = [
      'tab flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition-all',
      isActive
        ? 'bg-base-100 shadow-md text-primary tab-active'
        : 'text-neutral hover:text-primary',
    ].join(' ');

    // Add icon
    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = renderIcon(tab.icon);
    iconSpan.className = 'shrink-0';
    iconSpan.setAttribute('aria-hidden', 'true');
    button.appendChild(iconSpan);

    // Add label
    const labelSpan = document.createElement('span');
    labelSpan.textContent = tab.label;
    labelSpan.className = 'hidden sm:inline';
    button.appendChild(labelSpan);

    container.appendChild(button);
  });

  return container;
}

// Default
export const Default: StoryObj = {
  args: {
    activeTab: 'compound',
  },
  render: (args) => createTabSwitcher(args),
};

// Loan Tab Active
export const LoanActive: StoryObj = {
  args: {
    activeTab: 'loan',
  },
  render: (args) => createTabSwitcher(args),
};

// Savings Tab Active
export const SavingsActive: StoryObj = {
  args: {
    activeTab: 'savings',
  },
  render: (args) => createTabSwitcher(args),
};

// All Tabs Side by Side
export const AllTabs: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-8 max-w-4xl';

    const states = [
      { activeTab: 'compound', label: 'Compound Active' },
      { activeTab: 'loan', label: 'Loan Active' },
      { activeTab: 'savings', label: 'Savings Active' },
    ];

    states.forEach((state) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'space-y-2';
      const label = document.createElement('p');
      label.className = 'text-sm font-medium text-base-content/60';
      label.textContent = state.label;
      wrapper.appendChild(label);
      wrapper.appendChild(createTabSwitcher({ activeTab: state.activeTab }));
      container.appendChild(wrapper);
    });

    return container;
  },
};

// Mobile Preview
export const MobilePreview: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'w-[375px] border border-base-300 p-8 rounded-box';
    container.style.background =
      'var(--fallback-b1, oklch(var(--b1) 0.5 0.25 var(--fallback-b1, #fff) / 0.95)';

    const label = document.createElement('p');
    label.className = 'text-sm font-medium text-base-content/60 mb-4';
    label.textContent = 'Mobile Preview (375px)';
    container.appendChild(label);

    container.appendChild(createTabSwitcher({ activeTab: 'compound' }));

    return container;
  },
};
