/**
 * MobileNavigation Component Stories
 *
 * Storybook stories for the mobile bottom navigation component.
 * Shows various states including active nav items and dark mode.
 */

import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Layouts/MobileNavigation',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  argTypes: {
    currentPath: {
      control: 'select',
      options: ['/dashboard', '/transactions', '/assets', '/budget', '/reports'],
      description: 'Current active route path',
    },
  },
};

export default meta;

// SVG icons for Storybook (since we can't use Astro components directly)
const icons = {
  receipt: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>`,
  wallet: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`,
  logo: `<img src="/favicon.svg" alt="" class="w-9 h-9" aria-hidden="true" />`,
  donut: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.2 11A8.5 8.5 0 0 0 13 4.2V2a1 1 0 0 0-2 0v2.2a8.5 8.5 0 0 0-7.2 6.8H2a1 1 0 0 0 0 2h1.8a8.5 8.5 0 0 0 7.2 6.8V22a1 1 0 0 0 2 0v-2.2a8.5 8.5 0 0 0 7.2-6.8H22a1 1 0 0 0 0-2Zm-4.7 0h-4A1.5 1.5 0 0 1 10 9.5v-3a6.5 6.5 0 0 1 5.5 4.5Z"/></svg>`,
  chartBar: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>`,
};

interface NavItemConfig {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItemConfig[] = [
  { href: '/transactions', label: 'Activity', icon: icons.receipt },
  { href: '/assets', label: 'Assets', icon: icons.wallet },
  { href: '/budget', label: 'Budgets', icon: icons.donut },
  { href: '/reports', label: 'Reports', icon: icons.chartBar },
];

const isActive = (href: string, currentPath: string) => {
  if (currentPath === href) return true;
  if (href === '/dashboard' && (currentPath === '/' || currentPath === '/dashboard')) return true;
  return currentPath.startsWith(href + '/');
};

const createMobileNavigation = (args: { currentPath?: string }): HTMLElement => {
  const { currentPath = '/dashboard' } = args;

  const nav = document.createElement('nav');
  nav.className =
    'mobile-nav-surface fixed bottom-0 left-0 right-0 z-50 border-t border-base-300 px-4 pb-4 pt-3 backdrop-blur-2xl';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Mobile navigation');

  const topAccentLine = document.createElement('div');
  topAccentLine.className =
    'mobile-nav-top-accent pointer-events-none absolute inset-x-0 top-0 h-px';
  topAccentLine.setAttribute('aria-hidden', 'true');
  nav.appendChild(topAccentLine);

  const container = document.createElement('div');
  container.className = 'flex justify-between items-end max-w-md mx-auto relative h-14';

  const accentHalo = document.createElement('div');
  accentHalo.className =
    'mobile-nav-fab-halo pointer-events-none absolute left-1/2 top-0 h-14 w-32 -translate-x-1/2 -translate-y-5 rounded-full blur-2xl';
  accentHalo.setAttribute('aria-hidden', 'true');
  container.appendChild(accentHalo);

  // Left nav items (Activity, Assets)
  navItems.slice(0, 2).forEach((item) => {
    const active = isActive(item.href, currentPath);
    const link = createNavItem(item, active);
    container.appendChild(link);
  });

  // Center FAB (New Transaction)
  const fabContainer = document.createElement('div');
  fabContainer.className = 'mobile-nav-fab-offset flex-1 flex justify-center pointer-events-none';

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.setAttribute('data-open-transaction-drawer', '');
  fab.className =
    'mobile-nav-fab-surface w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 pointer-events-auto border-4 border-base-100 ring-1 ring-accent/30 min-w-16 min-h-16 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent focus-visible:ring-offset-4 bg-base-100';
  fab.setAttribute('aria-label', 'New Transaction');
  fab.innerHTML = icons.logo;

  fabContainer.appendChild(fab);
  container.appendChild(fabContainer);

  // Right nav items (Budgets, Reports)
  navItems.slice(2).forEach((item) => {
    const active = isActive(item.href, currentPath);
    const link = createNavItem(item, active);
    container.appendChild(link);
  });

  nav.appendChild(container);

  // Wrap in a container that simulates mobile viewport
  const wrapper = document.createElement('div');
  wrapper.className = 'relative min-h-52 bg-base-200';
  wrapper.appendChild(nav);

  return wrapper;
};

const createNavItem = (item: NavItemConfig, active: boolean): HTMLElement => {
  const link = document.createElement('a');
  link.href = item.href;
  link.className = `group flex-1 flex flex-col items-center gap-1 py-1 transition-all active:scale-95 min-w-11 min-h-11 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
    active ? 'text-accent' : 'text-base-content/80 hover:text-base-content'
  }`;
  if (active) {
    link.setAttribute('aria-current', 'page');
  }
  link.setAttribute('aria-label', item.label);

  const iconContainer = document.createElement('div');
  iconContainer.className = `relative flex items-center justify-center w-12 h-8 rounded-full transition-colors ${
    active ? 'bg-accent/20' : 'bg-base-200 group-hover:bg-base-300'
  }`;

  const iconWrapper = document.createElement('span');
  iconWrapper.className = `transition-transform ${active ? 'scale-110' : ''}`;
  iconWrapper.innerHTML = item.icon;
  iconContainer.appendChild(iconWrapper);

  if (active) {
    const dot = document.createElement('span');
    dot.className = 'absolute -bottom-1 w-1 h-1 rounded-full bg-accent';
    dot.setAttribute('aria-hidden', 'true');
    iconContainer.appendChild(dot);
  }

  const label = document.createElement('span');
  label.className = `text-xs font-bold tracking-tight uppercase leading-none mt-1 transition-colors ${
    active ? 'text-accent' : 'text-base-content/80 group-hover:text-base-content'
  }`;
  label.textContent = item.label;

  link.appendChild(iconContainer);
  link.appendChild(label);

  return link;
};

// Stories
export const Dashboard: StoryObj = {
  args: {
    currentPath: '/dashboard',
  },
  render: (args) => createMobileNavigation(args),
};

export const Activity: StoryObj = {
  args: {
    currentPath: '/transactions',
  },
  render: (args) => createMobileNavigation(args),
};

export const Assets: StoryObj = {
  args: {
    currentPath: '/assets',
  },
  render: (args) => createMobileNavigation(args),
};

export const Budgets: StoryObj = {
  args: {
    currentPath: '/budget',
  },
  render: (args) => createMobileNavigation(args),
};

export const Reports: StoryObj = {
  args: {
    currentPath: '/reports',
  },
  render: (args) => createMobileNavigation(args),
};

// Accessibility story demonstrating ARIA attributes
export const AccessibilityDemo: StoryObj = {
  args: {
    currentPath: '/dashboard',
  },
  render: (args) => {
    const wrapper = createMobileNavigation(args);
    const info = document.createElement('div');
    info.className = 'p-4 bg-base-100 mb-4 rounded-lg text-sm';
    info.innerHTML = `
      <h3 class="font-bold mb-2">Accessibility Features:</h3>
      <ul class="list-disc list-inside space-y-1 text-neutral">
        <li><code>role="navigation"</code> on nav element</li>
        <li><code>aria-label="Mobile navigation"</code> for screen readers</li>
        <li><code>aria-current="page"</code> on active item</li>
        <li><code>aria-label</code> on each nav link</li>
        <li>Minimum 44x44px touch targets</li>
        <li>Icons have <code>aria-hidden="true"</code></li>
      </ul>
    `;
    wrapper.insertBefore(info, wrapper.firstChild);
    return wrapper;
  },
};

// Focus states story demonstrating keyboard navigation
export const FocusStates: StoryObj = {
  args: {
    currentPath: '/dashboard',
  },
  render: (args) => {
    const wrapper = createMobileNavigation(args);
    const info = document.createElement('div');
    info.className = 'p-4 bg-base-100 mb-4 rounded-lg text-sm';
    info.innerHTML = `
      <h3 class="font-bold mb-2">Focus State Demo:</h3>
      <p class="text-neutral mb-2">Use <kbd class="kbd kbd-sm">Tab</kbd> to navigate between items and observe focus rings.</p>
      <p class="text-neutral">All interactive elements have:</p>
      <ul class="list-disc list-inside space-y-1 text-neutral mt-2">
        <li><code>focus-visible:ring-2</code> for visible focus indicator</li>
        <li><code>focus-visible:ring-accent</code> using design system accent color</li>
        <li><code>focus-visible:ring-offset-2</code> for spacing from element</li>
        <li><code>focus-visible:outline-none</code> to remove default outline</li>
      </ul>
    `;
    wrapper.insertBefore(info, wrapper.firstChild);
    // Auto-focus first link after render
    setTimeout(() => {
      const firstLink = wrapper.querySelector('a');
      if (firstLink) firstLink.focus();
    }, 100);
    return wrapper;
  },
};
