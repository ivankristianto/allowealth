import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Layouts/Navigation',
  tags: ['autodocs'],
  argTypes: {
    currentPath: {
      control: 'select',
      options: [
        '/',
        '/dashboard',
        '/transactions',
        '/budget',
        '/assets',
        '/reports',
        '/forecast',
        '/calculators',
        '/settings',
      ],
    },
  },
};

export default meta;

// Lucide-style icon SVGs for Storybook
const icons = {
  layoutDashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  currencyDollar: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  triangleAlert: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
};

const createNavigation = (args: { currentPath?: string }): HTMLElement => {
  const { currentPath = '/' } = args;

  const aside = document.createElement('aside');
  aside.className = 'bg-base-100 w-64 min-h-screen border-r border-base-300 flex flex-col';

  // Mobile close button
  const mobileHeader = document.createElement('div');
  mobileHeader.className =
    'lg:hidden p-4 border-b border-base-300 flex justify-between items-center';
  mobileHeader.innerHTML = `
    <span class="font-bold text-lg">Menu</span>
    <label for="nav-drawer-toggle" class="btn btn-sm btn-circle btn-ghost">
      ${icons.x}
    </label>
  `;
  aside.appendChild(mobileHeader);

  // Navigation items
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', iconKey: 'layoutDashboard' as const },
    { href: '/transactions', label: 'Transactions', iconKey: 'search' as const },
    { href: '/budget', label: 'Budget', iconKey: 'calendar' as const },
    { href: '/assets', label: 'Assets', iconKey: 'currencyDollar' as const },
    { href: '/reports', label: 'Reports', iconKey: 'info' as const },
    { href: '/forecast', label: 'Forecast', iconKey: 'triangleAlert' as const },
    { href: '/calculators', label: 'Calculators', iconKey: 'plus' as const },
    { href: '/settings', label: 'Settings', iconKey: 'settings' as const },
  ];

  const ul = document.createElement('ul');
  ul.className = 'menu p-4 w-full flex-1';

  const isActive = (href: string) => {
    // Exact match for index routes
    if (currentPath === href) return true;
    // For nested routes (e.g., /assets/add), parent is active if path starts with href + '/'
    return currentPath.startsWith(href + '/');
  };

  navItems.forEach((item) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.href;
    a.className = isActive(item.href) ? 'active gap-3' : 'gap-3';
    if (isActive(item.href)) {
      a.setAttribute('aria-current', 'page');
    }
    a.innerHTML = `
      ${icons[item.iconKey]}
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
        <div class="bg-base-300 text-base-content rounded-full w-10">
          <span class="text-xs">UK</span>
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">User Name</p>
        <p class="text-xs text-base-content/60 truncate">user@example.com</p>
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
