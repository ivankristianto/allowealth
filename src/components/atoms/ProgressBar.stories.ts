import type { Meta, StoryObj } from '@storybook/html';
import { getProgressBarStatusColors, type ProgressBarStatus } from '@/lib/tokens';

const meta: Meta = {
  title: 'Atoms/ProgressBar',
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'number',
      description: 'Progress percentage (0-100)',
    },
    status: {
      control: 'select',
      options: ['ok', 'warning', 'danger'],
      description: 'Color status variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Bar height',
    },
    showLabel: {
      control: 'boolean',
      description: 'Show percentage label',
    },
    animate: {
      control: 'boolean',
      description: 'Enable animation',
    },
  },
};

export default meta;

const sizeClasses: Record<string, string> = { sm: 'h-2', md: 'h-3', lg: 'h-4' };
const statusClasses: Record<ProgressBarStatus, string> = {
  ok: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-error',
};

const createProgressBar = (args: {
  value?: number;
  status?: ProgressBarStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}): HTMLElement => {
  const { value = 0, status = 'ok', size = 'md', showLabel = false, animate = true } = args;
  const clampedValue = Math.max(0, Math.min(100, value));

  const container = document.createElement('div');
  container.className = 'flex items-center gap-3';

  const barContainer = document.createElement('div');
  barContainer.className = `w-full bg-base-300 rounded-full overflow-hidden shadow-inner ${sizeClasses[size]}`;
  barContainer.setAttribute('role', 'progressbar');
  barContainer.setAttribute('aria-valuenow', String(clampedValue));
  barContainer.setAttribute('aria-valuemin', '0');
  barContainer.setAttribute('aria-valuemax', '100');

  const barFill = document.createElement('div');
  barFill.className = `h-full rounded-full transition-all duration-1000 shadow-md ${animate ? 'animate-in slide-in-from-left' : ''} ${statusClasses[status]}`;
  barFill.style.width = `${clampedValue}%`;

  barContainer.appendChild(barFill);
  container.appendChild(barContainer);

  if (showLabel) {
    const label = document.createElement('span');
    label.className = `text-xs font-bold tracking-wider uppercase ${getProgressBarStatusColors(status)} px-2 py-1 rounded-full shrink-0`;
    label.textContent = `${clampedValue}% used`;
    container.appendChild(label);
  }

  return container;
};

export const Ok: StoryObj = {
  args: {
    value: 45,
    status: 'ok',
    size: 'md',
    showLabel: false,
    animate: true,
  },
  render: (args) => createProgressBar(args),
};

export const Warning: StoryObj = {
  args: {
    value: 82,
    status: 'warning',
    size: 'md',
    showLabel: false,
    animate: true,
  },
  render: (args) => createProgressBar(args),
};

export const Danger: StoryObj = {
  args: {
    value: 105,
    status: 'danger',
    size: 'md',
    showLabel: false,
    animate: true,
  },
  render: (args) => createProgressBar(args),
};

export const WithLabel: StoryObj = {
  args: {
    value: 67,
    status: 'ok',
    size: 'md',
    showLabel: true,
    animate: true,
  },
  render: (args) => createProgressBar(args),
};

export const Sizes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-4 p-4';

    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      const wrapper = document.createElement('div');

      const label = document.createElement('span');
      label.className = 'text-xs font-bold text-base-content/60 mb-2 block';
      label.textContent = size.charAt(0).toUpperCase() + size.slice(1);
      wrapper.appendChild(label);

      wrapper.appendChild(
        createProgressBar({ value: 50, status: 'ok', size, showLabel: false, animate: false })
      );
      container.appendChild(wrapper);
    });

    return container;
  },
};

export const AllStatuses: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-4 p-4';

    const statuses: Array<{ status: 'ok' | 'warning' | 'danger'; value: number; label: string }> = [
      { status: 'ok', value: 45, label: 'OK (Under 80%)' },
      { status: 'warning', value: 85, label: 'Warning (80-99%)' },
      { status: 'danger', value: 105, label: 'Danger (100%+)' },
    ];

    statuses.forEach(({ status, value, label }) => {
      const wrapper = document.createElement('div');

      const labelText = document.createElement('span');
      labelText.className = 'text-xs font-bold text-base-content/60 mb-2 block';
      labelText.textContent = label;
      wrapper.appendChild(labelText);

      wrapper.appendChild(
        createProgressBar({ value, status, size: 'md', showLabel: false, animate: false })
      );
      container.appendChild(wrapper);
    });

    return container;
  },
};
