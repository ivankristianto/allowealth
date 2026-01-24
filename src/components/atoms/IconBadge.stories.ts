import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/IconBadge',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'accent', 'success', 'warning', 'error', 'info', 'neutral'],
      description: 'Color variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Badge size',
    },
    outlined: {
      control: 'boolean',
      description: 'Use outlined style',
    },
  },
};

export default meta;

const sizeClasses: Record<string, string> = { sm: 'p-3', md: 'p-4', lg: 'p-5' };
const iconSizeClasses: Record<string, string> = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
};
const variantClasses: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
  neutral: 'bg-base-300 text-base-content',
};

const createIconBadge = (
  args: {
    variant?: string;
    size?: string;
    outlined?: boolean;
  },
  iconSvg: string
): HTMLElement => {
  const { variant = 'primary', size = 'md', outlined = false } = args;

  const container = document.createElement('div');
  container.className = 'inline-block';

  const classes = [
    'rounded-2xl shrink-0',
    sizeClasses[size],
    outlined ? 'bg-base-100 border border-base-300' : variantClasses[variant],
    !outlined && 'shadow-sm',
  ].join(' ');

  container.innerHTML = `<div class="${classes}"><span class="${iconSizeClasses[size]} block">${iconSvg}</span></div>`;

  return container;
};

// Icons
const dollarSignIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';

const clockIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';

const checkCircleIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

const alertTriangleIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';

const xCircleIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';

const infoIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';

const checkIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';

export const Primary: StoryObj = {
  args: { variant: 'primary', size: 'md', outlined: false },
  render: (args) => createIconBadge(args, dollarSignIcon),
};

export const Accent: StoryObj = {
  args: { variant: 'accent', size: 'md', outlined: false },
  render: (args) => createIconBadge(args, clockIcon),
};

export const Success: StoryObj = {
  args: { variant: 'success', size: 'md', outlined: false },
  render: (args) => createIconBadge(args, checkCircleIcon),
};

export const Warning: StoryObj = {
  args: { variant: 'warning', size: 'md', outlined: false },
  render: (args) => createIconBadge(args, alertTriangleIcon),
};

export const Error: StoryObj = {
  args: { variant: 'error', size: 'md', outlined: false },
  render: (args) => createIconBadge(args, xCircleIcon),
};

export const Info: StoryObj = {
  args: { variant: 'info', size: 'md', outlined: false },
  render: (args) => createIconBadge(args, infoIcon),
};

export const Outlined: StoryObj = {
  args: { variant: 'warning', size: 'md', outlined: true },
  render: (args) => createIconBadge(args, alertTriangleIcon),
};

export const Sizes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex items-center gap-4 p-4';

    const sizes = ['sm', 'md', 'lg'] as const;
    const sizeLabels = ['Small', 'Medium', 'Large'];

    sizes.forEach((size, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'text-center';

      wrapper.appendChild(createIconBadge({ variant: 'accent', size, outlined: false }, clockIcon));

      const label = document.createElement('span');
      label.className = 'text-xs text-base-content/60 mt-2 block';
      label.textContent = sizeLabels[index];
      wrapper.appendChild(label);

      container.appendChild(wrapper);
    });

    return container;
  },
};

export const AllVariants: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-wrap gap-4 p-4';

    const variants: Array<{ variant: string; icon: string }> = [
      { variant: 'primary', icon: dollarSignIcon },
      { variant: 'accent', icon: clockIcon },
      { variant: 'success', icon: checkCircleIcon },
      { variant: 'warning', icon: alertTriangleIcon },
      { variant: 'error', icon: xCircleIcon },
      { variant: 'info', icon: infoIcon },
      { variant: 'neutral', icon: checkIcon },
    ];

    variants.forEach(({ variant, icon }) => {
      container.appendChild(createIconBadge({ variant, size: 'md', outlined: false }, icon));
    });

    return container;
  },
};
