import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { TriangleAlert, DollarSign, CircleAlert, Info: InfoIcon } = IconRenderers;

const meta: Meta = {
  title: 'Molecules/NotificationItem',
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['warning', 'success', 'alert', 'info'],
      description: 'Notification type',
    },
    title: {
      control: 'text',
      description: 'Notification title',
    },
    description: {
      control: 'text',
      description: 'Notification description',
    },
    time: {
      control: 'text',
      description: 'Time ago (e.g., "2m ago")',
    },
  },
};

export default meta;

const iconMap = {
  warning: TriangleAlert,
  success: DollarSign,
  alert: CircleAlert,
  info: InfoIcon,
};

// Using DaisyUI semantic classes with opacity
const bgMap = {
  warning: 'bg-warning/10 text-warning dark:bg-warning/20',
  success: 'bg-success/10 text-success dark:bg-success/20',
  alert: 'bg-error/10 text-error dark:bg-error/20',
  info: 'bg-info/10 text-info dark:bg-info/20',
};

const createNotificationItem = (args: {
  type?: 'warning' | 'success' | 'alert' | 'info';
  title?: string;
  description?: string;
  time?: string;
}): HTMLElement => {
  const {
    type = 'warning',
    title = 'Budget Alert',
    description = 'Dining has reached 95% of its monthly limit.',
    time = '2m ago',
  } = args;

  const container = document.createElement('div');
  container.className =
    'p-5 hover:bg-base-200/50 dark:hover:bg-base-200/20 transition-colors cursor-pointer flex gap-5';

  const iconDiv = document.createElement('div');
  iconDiv.className = `w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${bgMap[type]} shadow-sm`;

  const IconComponent = iconMap[type];
  iconDiv.appendChild(IconComponent.render({ size: 24, class: 'shrink-0', 'aria-hidden': 'true' }));

  container.appendChild(iconDiv);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'flex-1 min-w-0';

  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex justify-between items-start mb-1.5 leading-none';

  const titleEl = document.createElement('p');
  titleEl.className = 'text-base font-bold text-base-content tracking-tight';
  titleEl.textContent = title;
  headerDiv.appendChild(titleEl);

  const timeEl = document.createElement('span');
  timeEl.className = 'text-[10px] font-bold text-neutral uppercase tracking-widest';
  timeEl.textContent = time;
  headerDiv.appendChild(timeEl);

  contentDiv.appendChild(headerDiv);

  const descEl = document.createElement('p');
  descEl.className = 'text-sm text-neutral leading-relaxed line-clamp-2';
  descEl.textContent = description;
  contentDiv.appendChild(descEl);

  container.appendChild(contentDiv);

  return container;
};

export const Default: StoryObj = {
  args: {
    type: 'warning',
    title: 'Budget Alert',
    description: 'Dining has reached 95% of its monthly limit.',
    time: '2m ago',
  },
  render: (args) => createNotificationItem(args),
  parameters: {
    docs: {
      description: {
        story: 'Default notification item with warning type using DaisyUI semantic classes.',
      },
    },
  },
};

export const Success: StoryObj = {
  args: {
    type: 'success',
    title: 'Salary Received',
    description: 'Acme Corp deposited Rp51.025.000.',
    time: '4h ago',
  },
  render: (args) => createNotificationItem(args),
  parameters: {
    docs: {
      description: {
        story: 'Success notification item with green theme using DaisyUI success color.',
      },
    },
  },
};

export const Alert: StoryObj = {
  args: {
    type: 'alert',
    title: 'Budget exceeded',
    description: 'Dining out is 120% over budget.',
    time: '1h ago',
  },
  render: (args) => createNotificationItem(args),
  parameters: {
    docs: {
      description: {
        story: 'Alert notification item with red theme using DaisyUI error color.',
      },
    },
  },
};

export const Info: StoryObj = {
  args: {
    type: 'info',
    title: 'Asset update reminder',
    description: 'Update your stock portfolio.',
    time: '1d ago',
  },
  render: (args) => createNotificationItem(args),
  parameters: {
    docs: {
      description: {
        story: 'Info notification item with indigo theme using DaisyUI info color.',
      },
    },
  },
};

export const AllTypes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-1 divide-y divide-base-300 max-w-md';

    const types = [
      {
        type: 'warning' as const,
        title: 'Budget Alert',
        description: 'Dining has reached 95% of its monthly limit.',
        time: '2m ago',
      },
      {
        type: 'success' as const,
        title: 'Salary Received',
        description: 'Acme Corp deposited Rp51.025.000.',
        time: '4h ago',
      },
      {
        type: 'alert' as const,
        title: 'Budget exceeded',
        description: 'Dining out is 120% over budget.',
        time: '1h ago',
      },
      {
        type: 'info' as const,
        title: 'Asset update reminder',
        description: 'Update your stock portfolio.',
        time: '1d ago',
      },
    ];

    types.forEach((item) => {
      const notificationItem = createNotificationItem(item);
      container.appendChild(notificationItem);
    });

    return container;
  },
  parameters: {
    docs: {
      description: {
        story: 'All notification types displayed together using DaisyUI semantic colors.',
      },
    },
  },
};

export const DarkMode: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-1 divide-y divide-base-300 max-w-md';

    const types = [
      {
        type: 'warning' as const,
        title: 'Budget Alert',
        description: 'Dining has reached 95% of its monthly limit.',
        time: '2m ago',
      },
      {
        type: 'success' as const,
        title: 'Salary Received',
        description: 'Acme Corp deposited Rp51.025.000.',
        time: '4h ago',
      },
    ];

    types.forEach((item) => {
      const notificationItem = createNotificationItem(item);
      container.appendChild(notificationItem);
    });

    return container;
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Notification items in dark mode with DaisyUI theme-aware colors.',
      },
    },
  },
};
