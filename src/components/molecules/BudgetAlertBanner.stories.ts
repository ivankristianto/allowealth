import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/BudgetAlertBanner',
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Alert title',
    },
    message: {
      control: 'text',
      description: 'Alert message content',
    },
    variant: {
      control: 'select',
      options: ['warning', 'error', 'info'],
      description: 'Alert variant',
    },
    dismissible: {
      control: 'boolean',
      description: 'Show dismiss button',
    },
  },
};

export default meta;

const variantClasses: Record<
  string,
  { bg: string; border: string; icon: string; title: string; message: string }
> = {
  warning: {
    bg: 'bg-warning/5 dark:bg-warning/10',
    border: 'border-warning/20 dark:border-warning/30',
    icon: 'text-warning',
    title: 'text-warning dark:text-warning',
    message: 'text-warning/90 dark:text-warning/80',
  },
  error: {
    bg: 'bg-error/5 dark:bg-error/10',
    border: 'border-error/20 dark:border-error/30',
    icon: 'text-error',
    title: 'text-error dark:text-error',
    message: 'text-error/90 dark:text-error/80',
  },
  info: {
    bg: 'bg-info/5 dark:bg-info/10',
    border: 'border-info/20 dark:border-info/30',
    icon: 'text-info',
    title: 'text-info dark:text-info',
    message: 'text-info/90 dark:text-info/80',
  },
};

const icons: Record<string, string> = {
  warning:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  error:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
};

const dismissIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-4 w-4"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';

const createBudgetAlertBanner = (args: {
  title?: string;
  message?: string;
  variant?: 'warning' | 'error' | 'info';
  dismissible?: boolean;
}): HTMLElement => {
  const { title = 'Budget alert', message = '', variant = 'warning', dismissible = false } = args;

  const style = variantClasses[variant];

  const container = document.createElement('div');
  container.className = `p-6 rounded-3xl border ${style.bg} ${style.border}`;
  container.setAttribute('role', 'alert');
  container.setAttribute('aria-live', 'polite');

  const innerDiv = document.createElement('div');
  innerDiv.className = 'flex items-start gap-3';

  const iconDiv = document.createElement('div');
  iconDiv.className = `${style.icon} shrink-0 mt-0.5`;
  iconDiv.innerHTML = icons[variant];

  const contentDiv = document.createElement('div');
  contentDiv.className = 'flex-1 min-w-0';

  const titleEl = document.createElement('p');
  titleEl.className = `text-sm font-bold tracking-wide ${style.title} leading-none mb-1.5`;
  titleEl.textContent = title;

  const messageEl = document.createElement('p');
  messageEl.className = `text-base font-medium leading-relaxed ${style.message}`;
  messageEl.textContent = message;

  contentDiv.appendChild(titleEl);
  contentDiv.appendChild(messageEl);

  innerDiv.appendChild(iconDiv);
  innerDiv.appendChild(contentDiv);

  if (dismissible) {
    const dismissBtn = document.createElement('button');
    dismissBtn.className =
      'text-base-content/50 hover:text-base-content transition-colors p-1 -mr-1 -mt-1';
    dismissBtn.setAttribute('aria-label', 'Dismiss alert');
    dismissBtn.innerHTML = dismissIcon;

    dismissBtn.addEventListener('click', () => {
      container.remove();
    });

    innerDiv.appendChild(dismissBtn);
  }

  container.appendChild(innerDiv);

  return container;
};

export const Warning: StoryObj = {
  args: {
    title: 'Budget alert',
    message: "You've reached 95% of your dining budget. Consider eating at home this week.",
    variant: 'warning',
    dismissible: false,
  },
  render: (args) => createBudgetAlertBanner(args),
};

export const Error: StoryObj = {
  args: {
    title: 'Over budget',
    message:
      "You've exceeded your monthly budget by Rp2.500.000. Consider reducing discretionary spending.",
    variant: 'error',
    dismissible: false,
  },
  render: (args) => createBudgetAlertBanner(args),
};

export const Info: StoryObj = {
  args: {
    title: 'Budget tip',
    message:
      'Your transportation spending is 20% lower than last month. Great job keeping up with your savings goals!',
    variant: 'info',
    dismissible: false,
  },
  render: (args) => createBudgetAlertBanner(args),
};

export const Dismissible: StoryObj = {
  args: {
    title: 'Budget alert',
    message: "You've reached 95% of your dining budget. Consider eating at home this week.",
    variant: 'warning',
    dismissible: true,
  },
  render: (args) => createBudgetAlertBanner(args),
};

export const AllVariants: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-4 p-4 max-w-lg';

    const items = [
      {
        label: 'Warning',
        args: {
          title: 'Budget alert',
          message: "You've reached 95% of your dining budget.",
          variant: 'warning' as const,
        },
      },
      {
        label: 'Error',
        args: {
          title: 'Over budget',
          message: "You've exceeded your monthly budget by Rp2.500.000.",
          variant: 'error' as const,
        },
      },
      {
        label: 'Info',
        args: {
          title: 'Budget tip',
          message: 'Your transportation spending is 20% lower than last month.',
          variant: 'info' as const,
        },
      },
    ];

    items.forEach(({ label, args }) => {
      const wrapper = document.createElement('div');

      const labelEl = document.createElement('span');
      labelEl.className = 'text-xs font-bold text-base-content/60 mb-2 block';
      labelEl.textContent = label;
      wrapper.appendChild(labelEl);

      wrapper.appendChild(createBudgetAlertBanner({ ...args, dismissible: false }));
      container.appendChild(wrapper);
    });

    return container;
  },
};
