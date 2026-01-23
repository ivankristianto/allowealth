import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { Menu, Plus, Bell, ChevronDown } = IconRenderers;

const meta: Meta = {
  title: 'Layouts/Header',
  tags: ['autodocs'],
  argTypes: {
    currentPath: {
      control: 'select',
      options: ['/', '/dashboard', '/transactions', '/budget', '/assets', '/reports', '/settings'],
    },
    showMenuToggle: { control: 'boolean' },
    subtitle: {
      control: 'text',
      description: 'Subtitle text (e.g., period summary)',
    },
  },
};

export default meta;

const createHeader = (args: {
  currentPath?: string;
  showMenuToggle?: boolean;
  subtitle?: string;
}): HTMLElement => {
  const { currentPath = '/', showMenuToggle = true, subtitle = 'Summary for January 2024' } = args;

  const getPageTitle = (path: string) => {
    const titles: Record<string, string> = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/transactions': 'Transactions',
      '/budget': 'Budget',
      '/assets': 'Assets',
      '/reports': 'Reports',
      '/settings': 'Settings',
    };
    return titles[path] || 'Finance Manager';
  };

  const header = document.createElement('header');
  header.className =
    'glass-effect border-b border-base-300/50 px-6 lg:px-10 py-5 flex items-center justify-between gap-4 sticky top-0 z-40 bg-base-100/80 backdrop-blur-md';

  // Left side: Menu toggle + Page title + Subtitle
  const leftDiv = document.createElement('div');
  leftDiv.className = 'flex items-center gap-3';

  if (showMenuToggle) {
    const menuBtn = document.createElement('button');
    menuBtn.className = 'btn btn-square btn-ghost btn-sm lg:hidden';
    menuBtn.setAttribute('aria-label', 'Toggle menu');

    menuBtn.appendChild(
      Menu.render({ size: 24, class: 'stroke-current' }, { 'aria-hidden': 'true' })
    );

    leftDiv.appendChild(menuBtn);
  }

  const titleContainer = document.createElement('div');

  const title = document.createElement('h1');
  title.className = 'text-2xl lg:text-3xl font-bold tracking-tight text-primary leading-none';
  title.textContent = getPageTitle(currentPath);
  titleContainer.appendChild(title);

  const subtitleEl = document.createElement('p');
  subtitleEl.className = 'text-sm font-medium text-neutral hidden sm:block mt-1.5 leading-none';
  subtitleEl.textContent = subtitle;
  titleContainer.appendChild(subtitleEl);

  leftDiv.appendChild(titleContainer);
  header.appendChild(leftDiv);

  // Right side: Currency selector + Notifications + New Entry button
  const rightDiv = document.createElement('div');
  rightDiv.className = 'flex items-center gap-3 sm:gap-5';

  // Currency Selector (hidden on mobile) - simple minimalist design
  const currencyDiv = document.createElement('div');
  currencyDiv.className = 'hidden sm:block dropdown dropdown-end';

  const currencyButton = document.createElement('button');
  currencyButton.tabIndex = 0;
  currencyButton.className =
    'px-4 py-2 text-sm font-medium border border-base-300 bg-base-100 text-base-content rounded-xl hover:bg-base-200 transition-colors shadow-sm flex items-center gap-2';
  currencyButton.setAttribute('aria-label', 'Currency selector');

  const buttonText = document.createElement('span');
  buttonText.className = 'text-base-content';
  buttonText.textContent = 'IDR (Default)';
  currencyButton.appendChild(buttonText);

  const currencyChevron = document.createElement('div');
  currencyChevron.appendChild(
    ChevronDown.render({
      size: 14,
      class: 'stroke-current text-neutral shrink-0',
      'aria-hidden': 'true',
    })
  );
  currencyButton.appendChild(currencyChevron);

  currencyDiv.appendChild(currencyButton);

  // Dropdown menu - matching UserContext style
  const currencyMenu = document.createElement('ul');
  currencyMenu.tabIndex = 0;
  currencyMenu.className =
    'dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300';

  const currencyData = [
    { value: 'IDR', label: 'IDR (Default)' },
    { value: 'USD', label: 'USD' },
  ];

  currencyData.forEach((item) => {
    const li = document.createElement('li');

    const itemButton = document.createElement('button');
    itemButton.className = 'flex items-center gap-2 w-full text-left hover:bg-base-200 rounded-btn';
    itemButton.setAttribute('data-currency', item.value);
    itemButton.type = 'button';

    const itemLabel = document.createElement('span');
    itemLabel.className = 'text-base-content';
    itemLabel.textContent = item.label;
    itemButton.appendChild(itemLabel);

    li.appendChild(itemButton);
    currencyMenu.appendChild(li);
  });

  currencyDiv.appendChild(currencyMenu);
  rightDiv.appendChild(currencyDiv);

  // Notifications
  const notifDiv = document.createElement('div');
  notifDiv.className = 'relative';

  const notifBtn = document.createElement('button');
  notifBtn.id = 'notification-button';
  notifBtn.className =
    'p-3 rounded-full transition-all relative text-neutral hover:bg-base-100 shadow-sm border border-base-300';
  notifBtn.setAttribute('aria-label', 'Notifications');
  notifBtn.setAttribute('aria-expanded', 'false');
  notifBtn.setAttribute('aria-haspopup', 'true');

  notifBtn.appendChild(
    Bell.render({ size: 20, class: 'stroke-current' }, { 'aria-hidden': 'true' })
  );

  const badge = document.createElement('span');
  badge.className =
    'absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border-2 border-base-100 animate-pulse';
  badge.setAttribute('aria-hidden', 'true');
  notifBtn.appendChild(badge);

  notifDiv.appendChild(notifBtn);
  rightDiv.appendChild(notifDiv);

  // New Entry Button
  const addBtn = document.createElement('button');
  addBtn.className =
    'bg-accent hover:bg-accent-hover text-white px-4 sm:px-6 py-2.5 rounded-2xl flex items-center gap-2 font-bold shadow-xl shadow-accent/20 transition-all active:scale-95 text-base';
  addBtn.setAttribute('aria-label', 'Add new entry');

  addBtn.appendChild(Plus.render({ size: 20, class: 'stroke-current' }, { 'aria-hidden': 'true' }));

  const addSpan = document.createElement('span');
  addSpan.className = 'hidden sm:inline';
  addSpan.textContent = 'New Entry';
  addBtn.appendChild(addSpan);

  rightDiv.appendChild(addBtn);
  header.appendChild(rightDiv);

  return header;
};

export const Default: StoryObj = {
  args: { currentPath: '/dashboard' },
  render: (args) => createHeader(args),
  parameters: {
    docs: {
      description: {
        story:
          'Premium header with glass effect, page title, subtitle, currency selector, notifications, and new entry button.',
      },
    },
  },
};

export const Transactions: StoryObj = {
  args: { currentPath: '/transactions', subtitle: 'Summary for January 2024' },
  render: (args) => createHeader(args),
};

export const Budget: StoryObj = {
  args: { currentPath: '/budget', subtitle: 'Active limits for current period' },
  render: (args) => createHeader(args),
};

export const Settings: StoryObj = {
  args: { currentPath: '/settings', subtitle: 'Manage your preferences' },
  render: (args) => createHeader(args),
};

export const NoMenuToggle: StoryObj = {
  args: { showMenuToggle: false },
  render: (args) => createHeader(args),
  parameters: {
    docs: {
      description: {
        story: 'Header without mobile menu toggle (for pages without sidebar).',
      },
    },
  },
};

export const CustomSubtitle: StoryObj = {
  args: {
    currentPath: '/reports',
    subtitle: 'Financial insights and analytics',
  },
  render: (args) => createHeader(args),
  parameters: {
    docs: {
      description: {
        story: 'Header with custom subtitle text.',
      },
    },
  },
};

export const DarkMode: StoryObj = {
  args: { currentPath: '/dashboard' },
  render: (args) => createHeader(args),
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Header in dark mode with glass effect backdrop blur.',
      },
    },
  },
};
