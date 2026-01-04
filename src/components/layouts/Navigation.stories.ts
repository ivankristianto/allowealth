import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Layouts/Navigation',
  tags: ['autodocs'],
  argTypes: {
    currentPath: {
      control: 'select',
      options: ['/', '/dashboard', '/transactions', '/budget', '/assets', '/reports', '/forecast', '/calculators', '/settings'],
    },
  },
};

export default meta;

const createNavigation = (args: { currentPath?: string }): HTMLElement => {
  const { currentPath = '/' } = args;

  const aside = document.createElement('aside');
  aside.className = 'bg-base-100 w-64 min-h-screen border-r border-base-300 flex flex-col';

  // Mobile close button
  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'lg:hidden p-4 border-b border-base-300 flex justify-between items-center';
  mobileHeader.innerHTML = `
    <span class="font-bold text-lg">Menu</span>
    <label for="nav-drawer-toggle" class="btn btn-sm btn-circle btn-ghost">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </label>
  `;
  aside.appendChild(mobileHeader);

  // Navigation items
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'home' },
    { href: '/transactions', label: 'Transactions', icon: 'search' },
    { href: '/budget', label: 'Budget', icon: 'calendar' },
    { href: '/assets', label: 'Assets', icon: 'currency-dollar' },
    { href: '/reports', label: 'Reports', icon: 'information' },
    { href: '/forecast', label: 'Forecast', icon: 'warning' },
    { href: '/calculators', label: 'Calculators', icon: 'plus' },
    { href: '/settings', label: 'Settings', icon: 'pencil' },
  ];

  const ul = document.createElement('ul');
  ul.className = 'menu p-4 w-full flex-1';

  const isActive = (href: string) => {
    if (href === '/dashboard' && currentPath === '/') return true;
    return currentPath.startsWith(href);
  };

  navItems.forEach((item) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.href;
    a.className = isActive(item.href) ? 'active gap-3' : 'gap-3';
    a.setAttribute('aria-current', isActive(item.href) ? 'page' : 'false');
    a.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      <span>${item.label}</span>
    `;
    li.appendChild(a);
    ul.appendChild(li);
  });

  aside.appendChild(ul);

  // User section
  const userSection = document.createElement('div');
  userSection.className = 'p-4 border-t border-base-300 bg-base-100';
  userSection.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="avatar placeholder">
        <div class="bg-neutral text-neutral-content rounded-full w-10">
          <span class="text-xs">UK</span>
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">User Name</p>
        <p class="text-xs text-neutral-500 truncate">user@example.com</p>
      </div>
    </div>
  `;
  aside.appendChild(userSection);

  return aside;
};

export const Default: StoryObj = {
  args: { currentPath: '/dashboard' },
  render: (args) => createNavigation(args),
};

export const TransactionsActive: StoryObj = {
  args: { currentPath: '/transactions' },
  render: (args) => createNavigation(args),
};

export const BudgetActive: StoryObj = {
  args: { currentPath: '/budget' },
  render: (args) => createNavigation(args),
};

export const SettingsActive: StoryObj = {
  args: { currentPath: '/settings' },
  render: (args) => createNavigation(args),
};
