import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Layouts/Navigation',
  tags: ['autodocs'],
  argTypes: {
    currentPath: {
      control: 'select',
      options: [
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
  layoutDashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  receipt: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2z"/></svg>`,
  donut: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
  wallet: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`,
  chartBar: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>`,
  trendingUp: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  calculator: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="14"/><line x1="16" x2="16" y1="18" y2="18"/><line x1="12" x2="12" y1="14" y2="14"/><line x1="12" x2="12" y1="18" y2="18"/><line x1="8" x2="8" y1="14" y2="14"/><line x1="8" x2="8" y1="18" y2="18"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
};

const createNavigation = (args: { currentPath?: string }): HTMLElement => {
  const { currentPath = '/dashboard' } = args;

  const aside = document.createElement('aside');
  aside.className = 'bg-base-100 w-64 min-h-screen border-r border-base-300 flex flex-col';
  aside.setAttribute('role', 'navigation');
  aside.setAttribute('aria-label', 'Main navigation');

  // Skip link for keyboard users
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className =
    'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-content focus:rounded font-medium';
  skipLink.textContent = 'Skip to main content';
  aside.appendChild(skipLink);

  // Mobile close button
  const mobileHeader = document.createElement('div');
  mobileHeader.className =
    'lg:hidden p-4 border-b border-base-300 flex justify-between items-center';
  mobileHeader.innerHTML = `
    <span class="font-bold text-lg text-base-content">Menu</span>
    <label for="nav-drawer-toggle" class="btn btn-sm btn-circle btn-ghost" aria-label="Close menu">
      ${icons.x}
    </label>
  `;
  aside.appendChild(mobileHeader);

  // Brand Logo Section
  const brandSection = document.createElement('div');
  brandSection.className = 'p-8';
  brandSection.innerHTML = `
    <a href="/" class="flex items-center gap-3 group" aria-label="FamilyFinance Home">
      <div class="bg-accent text-accent-content rounded-2xl p-2 shadow-accent-glow transition-transform duration-200 group-hover:scale-105">
        ${icons.wallet}
      </div>
      <span class="text-xl font-bold tracking-tight text-base-content">
        FamilyFinance
      </span>
    </a>
  `;
  aside.appendChild(brandSection);

  // Navigation items - each with unique icon
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', iconKey: 'layoutDashboard' as const },
    { href: '/transactions', label: 'Transactions', iconKey: 'receipt' as const },
    { href: '/budget', label: 'Budget', iconKey: 'donut' as const },
    { href: '/assets', label: 'Assets', iconKey: 'wallet' as const },
    { href: '/reports', label: 'Reports', iconKey: 'chartBar' as const },
    { href: '/forecast', label: 'Forecast', iconKey: 'trendingUp' as const },
    { href: '/calculators', label: 'Calculators', iconKey: 'calculator' as const },
    { href: '/settings', label: 'Settings', iconKey: 'settings' as const },
  ];

  const ul = document.createElement('ul');
  ul.className = 'menu w-full flex-1 px-4 space-y-2';

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
    // New styling: border, no background change on hover, icon scale animation on hover
    const activeClass = isActive(item.href)
      ? 'relative flex items-center gap-4 py-3 px-5 font-bold text-base rounded-xl transition-all duration-200 group bg-accent/10 text-accent border border-accent/20'
      : 'relative flex items-center gap-4 py-3 px-5 font-medium text-base rounded-xl transition-all duration-200 group text-base-content/60 hover:text-base-content border border-transparent';
    a.className = activeClass;
    if (isActive(item.href)) {
      a.setAttribute('aria-current', 'page');
      // Add pulsing indicator dot for active item
      a.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 transition-transform duration-200 group-hover:scale-110 text-accent">${icons[item.iconKey].replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}</svg>
        <span>${item.label}</span>
      `;
      const dot = document.createElement('span');
      dot.className = 'ml-auto w-2 h-2 bg-accent rounded-full animate-pulse';
      dot.setAttribute('aria-hidden', 'true');
      a.appendChild(dot);
    } else {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = icons[item.iconKey];
      const svg = tempDiv.firstElementChild as SVGElement;
      if (svg) {
        svg.classList.add(
          'shrink-0',
          'transition-transform',
          'duration-200',
          'group-hover:scale-110'
        );
      }
      a.appendChild(svg);
      const span = document.createElement('span');
      span.textContent = item.label;
      a.appendChild(span);
    }
    li.appendChild(a);
    ul.appendChild(li);
  });

  aside.appendChild(ul);

  // User section with Pro Account
  const userSection = document.createElement('div');
  userSection.className = 'mt-auto p-5 border-t border-base-300';
  userSection.innerHTML = `
    <div class="flex items-center gap-3 p-4 bg-base-200/80 dark:bg-base-200/50 rounded-2xl border border-base-300 dark:border-base-300/50">
      <div class="avatar placeholder">
        <div class="bg-accent/20 text-accent rounded-full w-10 flex items-center justify-center shadow-inner">
          <span class="text-xs font-semibold">SJ</span>
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-base font-bold text-base-content truncate">Sarah Jenkins</p>
        <p class="text-xs text-base-content/80 font-medium tracking-wide truncate">Pro Account</p>
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

export const AssetsActive: StoryObj = {
  args: { currentPath: '/assets' },
  render: (args) => createNavigation(args),
};

export const ReportsActive: StoryObj = {
  args: { currentPath: '/reports' },
  render: (args) => createNavigation(args),
};

export const ForecastActive: StoryObj = {
  args: { currentPath: '/forecast' },
  render: (args) => createNavigation(args),
};

export const SettingsActive: StoryObj = {
  args: { currentPath: '/settings' },
  render: (args) => createNavigation(args),
};
