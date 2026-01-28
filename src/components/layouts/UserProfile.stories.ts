import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Layouts/UserProfile',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Avatar Size | 36px | \`w-9\` |
| Avatar Background | Accent 20% opacity | \`bg-accent/20\` |
| Avatar Text | Accent color | \`text-accent\` |
| Border Radius | 2xl | \`rounded-2xl\` |
| Shadow | Extra large | \`shadow-xl\` |

### Dropdown Menu

| Property | Value | Notes |
|----------|-------|-------|
| Position | Above button | \`bottom-full mb-2\` |
| Animation Duration | 200ms | \`duration-200\` |
| Animation Timing | Ease out | \`cubic-bezier(0.4, 0, 0.2, 1)\` |
| Transform | Slide up 8px | \`translateY(8px) -> translateY(0)\` |

### Menu Items

| Label | Route | Icon |
|-------|-------|------|
| Manage account | /profile | User |
| Security | /security | Shield |
| Sign out | POST /api/auth/logout | LogOut |

### Icon Specifications
- Menu item icons: 18px (small)
- Chevron toggle: 20px
- All icons from \`@lucide/astro\`

### Styling Classes
- Profile button: \`bg-base-200\`, \`border-base-300\`
- Dropdown: \`bg-base-100\`, \`border-base-300\`
- Text: \`text-base-content\` (primary), \`text-base-content/50\` (muted)
- Sign out: \`text-error\` (red)
- Hover states: \`rounded-xl\`

### Accessibility - Keyboard Navigation

| Key | Action |
|-----|--------|
| Enter/Space | Toggle dropdown |
| Escape | Close dropdown, return focus |
| ArrowDown | Next menu item |
| ArrowUp | Previous menu item |
| Tab | Close menu, continue navigation |

### ARIA Attributes
- Button: \`aria-expanded\`, \`aria-haspopup="menu"\`, \`aria-controls\`, \`aria-label="Open user menu"\`
- Menu container: \`role="menu"\`, \`aria-label="User profile menu"\`, \`tabindex="-1"\`
- Menu items: \`role="menuitem"\`, \`tabindex="-1"\`
- Divider: \`role="separator"\`
- Icons: \`aria-hidden="true"\` (decorative)

### Animations
- Dropdown fade-in: opacity 0 -> 1
- Dropdown slide-up: translateY(8px) -> translateY(0)
- Chevron rotation: 0deg -> 180deg on open
- All animations: 200ms duration

### Memory Management
- Event listeners cleaned up on \`astro:page-load\`
- MutationObserver watches for DOM removal
- Named functions for proper cleanup
        `,
      },
    },
  },
  argTypes: {
    userName: { control: 'text' },
    accountType: { control: 'text' },
    isOpen: { control: 'boolean' },
  },
};

export default meta;

const createUserProfile = (args: {
  userName?: string;
  accountType?: string;
  isOpen?: boolean;
}): HTMLElement => {
  const { userName = 'Sarah Jenkins', accountType = 'Pro Account', isOpen = false } = args;

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const container = document.createElement('div');
  container.className = 'relative p-4 bg-base-100 w-64';

  const button = document.createElement('button');
  button.className =
    'w-full flex items-center gap-3 p-4 bg-base-200/80 rounded-2xl border border-base-300 hover:bg-base-200 transition-colors';
  button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-label', 'Open user menu');

  button.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
      <span class="text-accent text-xs font-semibold">${initials}</span>
    </div>
    <div class="flex-1 text-left min-w-0">
      <p class="text-sm font-bold text-base-content truncate">${userName}</p>
      <p class="text-xs text-base-content/50 truncate">${accountType}</p>
    </div>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-base-content/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}" aria-hidden="true">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  `;

  container.appendChild(button);

  if (isOpen) {
    const dropdown = document.createElement('div');
    dropdown.className =
      'absolute bottom-full left-0 right-0 mb-2 bg-base-100 rounded-2xl border border-base-300 shadow-xl overflow-hidden';
    dropdown.setAttribute('role', 'menu');
    dropdown.setAttribute('aria-label', 'User profile menu');

    dropdown.innerHTML = `
      <ul class="p-2">
        <li>
          <a href="/profile" role="menuitem" tabindex="-1" class="flex items-center gap-3 px-4 py-3 text-sm text-base-content hover:bg-base-200 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Manage account
          </a>
        </li>
        <li>
          <a href="/security" role="menuitem" tabindex="-1" class="flex items-center gap-3 px-4 py-3 text-sm text-base-content hover:bg-base-200 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
            </svg>
            Security
          </a>
        </li>
        <li role="separator" class="my-1 border-t border-base-300"></li>
        <li>
          <button role="menuitem" tabindex="-1" class="w-full flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-base-200 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
            Sign out
          </button>
        </li>
      </ul>
    `;

    container.appendChild(dropdown);
  }

  return container;
};

export const Default: StoryObj = {
  args: { userName: 'Sarah Jenkins', accountType: 'Pro Account', isOpen: false },
  render: (args) => createUserProfile(args),
  parameters: {
    docs: {
      description: {
        story: 'User profile section in closed state, showing avatar with initials.',
      },
    },
  },
};

export const DropdownOpen: StoryObj = {
  args: { userName: 'Sarah Jenkins', accountType: 'Pro Account', isOpen: true },
  render: (args) => createUserProfile(args),
  parameters: {
    docs: {
      description: {
        story:
          'User profile with dropdown menu open, showing menu items positioned above the button.',
      },
    },
  },
};

export const LongName: StoryObj = {
  args: { userName: 'Alexandra Konstantinidis', accountType: 'Enterprise Account', isOpen: false },
  render: (args) => createUserProfile(args),
  parameters: {
    docs: {
      description: {
        story: 'User profile with long name, demonstrating text truncation.',
      },
    },
  },
};

export const FreeAccount: StoryObj = {
  args: { userName: 'John Doe', accountType: 'Free Account', isOpen: false },
  render: (args) => createUserProfile(args),
  parameters: {
    docs: {
      description: {
        story: 'User profile with free account type.',
      },
    },
  },
};
