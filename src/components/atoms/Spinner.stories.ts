import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Spinner',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    color: {
      control: 'select',
      options: ['accent', 'primary', 'secondary', 'success', 'warning', 'error'],
    },
  },
};

export default meta;

const createSpinner = (args: { size?: string; color?: string }): HTMLElement => {
  const { size = 'md', color = 'accent' } = args;

  const span = document.createElement('span');
  span.className = `loading loading-spinner loading-${size} text-${color}`;
  span.setAttribute('aria-label', 'Loading');
  span.setAttribute('aria-busy', 'true');

  return span;
};

export const Default: StoryObj = {
  args: { size: 'md', color: 'accent' },
  render: (args) => createSpinner(args),
};

export const ExtraSmall: StoryObj = {
  args: { size: 'xs', color: 'accent' },
  render: (args) => createSpinner(args),
};

export const Small: StoryObj = {
  args: { size: 'sm', color: 'accent' },
  render: (args) => createSpinner(args),
};

export const Medium: StoryObj = {
  args: { size: 'md', color: 'accent' },
  render: (args) => createSpinner(args),
};

export const Large: StoryObj = {
  args: { size: 'lg', color: 'accent' },
  render: (args) => createSpinner(args),
};

export const Success: StoryObj = {
  args: { size: 'md', color: 'success' },
  render: (args) => createSpinner(args),
};

export const Warning: StoryObj = {
  args: { size: 'md', color: 'warning' },
  render: (args) => createSpinner(args),
};

export const Error: StoryObj = {
  args: { size: 'md', color: 'error' },
  render: (args) => createSpinner(args),
};

export const AllSizes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex items-center gap-6';

    const sizes = ['xs', 'sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col items-center gap-2';

      const spinner = createSpinner({ size, color: 'accent' });
      const label = document.createElement('span');
      label.className = 'text-sm';
      label.textContent = size;

      wrapper.appendChild(spinner);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });

    return container;
  },
};

export const AllColors: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex items-center gap-6';

    const colors = ['accent', 'primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col items-center gap-2';

      const spinner = createSpinner({ size: 'md', color });
      const label = document.createElement('span');
      label.className = 'text-sm capitalize';
      label.textContent = color;

      wrapper.appendChild(spinner);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });

    return container;
  },
};

export const WithText: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex items-center gap-3';

    const spinner = createSpinner({ size: 'md', color: 'accent' });
    const text = document.createElement('span');
    text.textContent = 'Loading...';

    container.appendChild(spinner);
    container.appendChild(text);

    return container;
  },
};

export const FullPage: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center justify-center gap-4 min-h-[200px]';

    const spinner = createSpinner({ size: 'lg', color: 'accent' });
    const text = document.createElement('p');
    text.className = 'text-neutral-500';
    text.textContent = 'Please wait...';

    container.appendChild(spinner);
    container.appendChild(text);

    return container;
  },
};
