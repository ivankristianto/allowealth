import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/NotificationDropdown',
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the dropdown is open',
    },
  },
};

export default meta;

const createNotificationDropdown = (args: { isOpen?: boolean }): HTMLElement => {
  const { isOpen = true } = args;

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100 min-h-[500px]';

  const dropdown = document.createElement('div');
  dropdown.className =
    'absolute right-0 mt-4 w-80 bg-base-100 dark:bg-base-100 rounded-3xl border border-base-300 shadow-premium z-50 overflow-hidden';
  dropdown.style.display = isOpen ? 'block' : 'none';
  dropdown.setAttribute('role', 'menu');
  dropdown.setAttribute('aria-label', 'Notifications menu');

  // Header
  const header = document.createElement('div');
  header.className =
    'p-5 border-b border-base-300 flex justify-between items-center bg-base-200/50';

  const title = document.createElement('span');
  title.className = 'font-bold text-base text-neutral';
  title.textContent = 'Notifications';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.className =
    'text-sm font-bold text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded';
  closeBtn.textContent = 'Close';
  closeBtn.setAttribute('aria-label', 'Close notifications');
  header.appendChild(closeBtn);

  dropdown.appendChild(header);

  // Notification List
  const list = document.createElement('div');
  list.className = 'max-h-96 overflow-y-auto divide-y divide-base-300';

  // Mock notifications
  const notifications = [
    {
      type: 'warning',
      title: 'Budget Alert',
      description: 'Dining has reached 95% of its monthly limit.',
      time: '2m ago',
      colorClass: 'bg-warning/10 text-warning dark:bg-warning/20',
    },
    {
      type: 'success',
      title: 'Salary Received',
      description: 'Acme Corp deposited Rp51.025.000.',
      time: '4h ago',
      colorClass: 'bg-success/10 text-success dark:bg-success/20',
    },
  ];

  notifications.forEach((notif) => {
    const item = document.createElement('div');
    item.className = 'p-5 hover:bg-base-200/50 transition-colors cursor-pointer flex gap-5';

    const iconDiv = document.createElement('div');
    iconDiv.className = `w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${notif.colorClass} shadow-sm`;
    item.appendChild(iconDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex-1 min-w-0';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex justify-between items-start mb-1.5 leading-none';

    const titleEl = document.createElement('p');
    titleEl.className = 'text-base font-bold text-base-content tracking-tight';
    titleEl.textContent = notif.title;
    headerDiv.appendChild(titleEl);

    const timeEl = document.createElement('span');
    timeEl.className = 'text-[10px] font-bold text-neutral uppercase tracking-widest';
    timeEl.textContent = notif.time;
    headerDiv.appendChild(timeEl);

    contentDiv.appendChild(headerDiv);

    const descEl = document.createElement('p');
    descEl.className = 'text-sm text-neutral leading-relaxed';
    descEl.textContent = notif.description;
    contentDiv.appendChild(descEl);

    item.appendChild(contentDiv);
    list.appendChild(item);
  });

  dropdown.appendChild(list);

  // Footer
  const footer = document.createElement('button');
  footer.className =
    'w-full py-4 text-sm font-bold text-neutral hover:bg-base-200 transition-colors tracking-wide focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset';
  footer.textContent = 'View all history';
  footer.setAttribute('aria-label', 'View all notification history');

  dropdown.appendChild(footer);
  container.appendChild(dropdown);

  return container;
};

export const Default: StoryObj = {
  args: {
    isOpen: true,
  },
  render: (args) => createNotificationDropdown(args),
  parameters: {
    docs: {
      description: {
        story: 'Default notification dropdown panel with header, notification list, and footer.',
      },
    },
  },
};

export const Closed: StoryObj = {
  args: {
    isOpen: false,
  },
  render: (args) => createNotificationDropdown(args),
  parameters: {
    docs: {
      description: {
        story: 'Notification dropdown in closed state (hidden).',
      },
    },
  },
};

export const DarkMode: StoryObj = {
  args: {
    isOpen: true,
  },
  render: (args) => createNotificationDropdown(args),
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Notification dropdown in dark mode.',
      },
    },
  },
};
