import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { Menu, Plus, Bell, ChevronDown } = IconRenderers;

const meta: Meta = {
  title: 'Layouts/Header',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment (Oasis Finance v1.0.0)

| Property | Value | Class/Token |
|----------|-------|-------------|
| Height | 5rem (80px) | \`h-20\` |
| Padding | 1.25rem | \`p-5\` |
| Background | Glass effect | \`glass-effect\` |
| Border | Theme-aware | \`border-base-300\` |
| Icon Size | 22px | \`size={22}\` (md) |

### CTA Button Styling

| Property | Value | Class |
|----------|-------|-------|
| Style | Accent color | \`btn-accent\` |
| Size | Small | \`btn-sm\` |
| Shadow | Accent glow | \`shadow-accent-glow\` |

### Responsive Behavior
- **Mobile**: Menu toggle visible, "New Entry" text hidden (icon only)
- **Desktop (lg+)**: Menu toggle hidden, full "New Entry" button with text
- **Subtitle**: Hidden on mobile, visible on sm+ breakpoint

### Glass Effect Properties
- Backdrop filter: \`blur(12px)\`
- Background: \`rgba(255, 255, 255, 0.8)\`
- Applied via \`.glass-effect\` utility class

### Accessibility
- Menu toggle: \`aria-label="Toggle menu"\`
- Add new button: \`aria-label="Add new item"\`
- Notifications button: \`aria-label="Notifications"\`, \`aria-haspopup="true"\`, \`aria-expanded\`
- Semantic \`<header>\` element with proper landmark
- All icons have \`aria-hidden="true"\`
        `,
      },
    },
  },
  argTypes: {
    currentPath: {
      control: 'select',
      options: [
        '/',
        '/dashboard',
        '/transactions',
        '/budget',
        '/accounts',
        '/reports',
        '/settings',
        '/profile',
        '/security',
      ],
    },
    showMenuToggle: { control: 'boolean' },
    subtitle: {
      control: 'text',
      description: 'Subtitle text (e.g., period summary)',
    },
  },
};

export default meta;

/**
 * Get current month/year for subtitle generation (e.g., "January 2026")
 */
function getCurrentMonthYear(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
}

/**
 * Get dynamic subtitle based on current path
 */
function getDynamicSubtitle(path: string, customSubtitle?: string): string {
  if (customSubtitle) return customSubtitle;

  const subtitles: Record<string, string> = {
    '/': `Welcome back! ${getCurrentMonthYear()}`,
    '/dashboard': `Welcome back! ${getCurrentMonthYear()}`,
    '/transactions': getCurrentMonthYear(),
    '/budget': 'Monthly budget overview',
    '/accounts': getCurrentMonthYear(),
    '/reports': getCurrentMonthYear(),
    '/forecast': 'Based on your spending patterns',
    '/calculators': 'Financial planning tools',
    '/settings': 'Manage your preferences',
    '/profile': 'Manage your account details',
    '/security': 'Protect your account and devices',
  };

  return subtitles[path] || getCurrentMonthYear();
}

const createHeader = (args: {
  currentPath?: string;
  showMenuToggle?: boolean;
  subtitle?: string;
}): HTMLElement => {
  const { currentPath = '/', showMenuToggle = true, subtitle } = args;
  const dynamicSubtitle = getDynamicSubtitle(currentPath, subtitle);

  const getPageTitle = (path: string) => {
    const titles: Record<string, string> = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/transactions': 'Transactions',
      '/budget': 'Budget',
      '/accounts': 'Accounts',
      '/reports': 'Reports',
      '/settings': 'Settings',
      '/profile': 'Manage Account',
      '/security': 'Security',
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
  subtitleEl.textContent = dynamicSubtitle;
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
    itemButton.setAttribute('data-currency-selector', item.value);
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
  args: { currentPath: '/transactions' },
  render: (args) => createHeader(args),
  parameters: {
    docs: {
      description: {
        story: 'Header for Transactions page with current month subtitle.',
      },
    },
  },
};

export const Budget: StoryObj = {
  args: { currentPath: '/budget' },
  render: (args) => createHeader(args),
  parameters: {
    docs: {
      description: {
        story: 'Header for Budget page with overview subtitle.',
      },
    },
  },
};

export const Accounts: StoryObj = {
  args: { currentPath: '/accounts' },
  render: (args) => createHeader(args),
  parameters: {
    docs: {
      description: {
        story: 'Header for Accounts page with current period subtitle.',
      },
    },
  },
};

export const Settings: StoryObj = {
  args: { currentPath: '/settings' },
  render: (args) => createHeader(args),
  parameters: {
    docs: {
      description: {
        story: 'Header for Settings page with preferences subtitle.',
      },
    },
  },
};

export const Forecast: StoryObj = {
  args: { currentPath: '/forecast' },
  render: (args) => createHeader(args),
  parameters: {
    docs: {
      description: {
        story: 'Header for Forecast page with spending patterns subtitle.',
      },
    },
  },
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
    currentPath: '/transactions',
    subtitle: '23 transactions this month',
  },
  render: (args) => createHeader(args),
  parameters: {
    docs: {
      description: {
        story: 'Header with custom subtitle showing transaction count.',
      },
    },
  },
};

export const BudgetProgress: StoryObj = {
  args: {
    currentPath: '/budget',
    subtitle: 'Spent Rp 2.4M of Rp 8M',
  },
  render: (args) => createHeader(args),
  parameters: {
    docs: {
      description: {
        story: 'Header with custom subtitle showing budget progress.',
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
