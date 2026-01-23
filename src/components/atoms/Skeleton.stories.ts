import type { Meta, StoryObj } from '@storybook/html';

/**
 * Skeleton Component Stories
 *
 * Loading placeholder component that displays a pulsing animation
 * while content is being loaded.
 * Aligned with Oasis Finance v1.0.0 design system specifications.
 *
 * @see src/components/atoms/Skeleton.astro - Component implementation
 */

const meta: Meta = {
  title: 'Atoms/Skeleton',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'heading', 'button', 'card', 'circular', 'rectangular'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    animate: { control: 'boolean' },
    width: { control: 'text' },
    height: { control: 'text' },
  },
};

export default meta;

const createSkeleton = (args: {
  variant?: string;
  size?: string;
  width?: string;
  height?: string;
  animate?: boolean;
}): HTMLElement => {
  const { variant = 'rectangular', size = 'md', width = '', height = '', animate = true } = args;

  const skeleton = document.createElement('div');

  const sizeClasses: Record<string, string> = {
    sm: 'h-4 w-16',
    md: 'h-6 w-24',
    lg: 'h-8 w-32',
  };

  const variantClasses: Record<string, string> = {
    text: 'rounded h-4 w-full',
    heading: 'rounded-lg h-8 w-3/4',
    button: 'rounded-lg h-10 w-24',
    card: 'rounded-xl w-full h-32',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded-lg',
  };

  const baseClasses = [
    'bg-base-300',
    animate ? 'animate-pulse' : '',
    variantClasses[variant],
    !width && !height ? sizeClasses[size] : '',
  ]
    .filter(Boolean)
    .join(' ');

  skeleton.className = baseClasses;
  skeleton.setAttribute('aria-hidden', 'true');
  skeleton.setAttribute('role', 'presentation');

  if (width) skeleton.style.width = width;
  if (height) skeleton.style.height = height;

  return skeleton;
};

export const Default: StoryObj = {
  args: { variant: 'rectangular' },
  render: (args) => createSkeleton(args),
};

export const Text: StoryObj = {
  args: { variant: 'text' },
  render: (args) => createSkeleton(args),
};

export const Heading: StoryObj = {
  args: { variant: 'heading' },
  render: (args) => createSkeleton(args),
};

export const Button: StoryObj = {
  args: { variant: 'button' },
  render: (args) => createSkeleton(args),
};

export const Card: StoryObj = {
  args: { variant: 'card' },
  render: (args) => createSkeleton(args),
};

export const Circular: StoryObj = {
  args: { variant: 'circular', width: '64px', height: '64px' },
  render: (args) => createSkeleton(args),
};

export const NoAnimation: StoryObj = {
  args: { variant: 'rectangular', animate: false },
  render: (args) => createSkeleton(args),
};

export const AllVariants: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 w-64';

    const variants = [
      { variant: 'heading' as const, label: 'Heading' },
      { variant: 'text' as const, label: 'Text' },
      { variant: 'button' as const, label: 'Button' },
      { variant: 'circular' as const, label: 'Circular', width: '48px', height: '48px' },
      { variant: 'rectangular' as const, label: 'Rectangular', width: '100%', height: '60px' },
    ];

    variants.forEach((v) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-4';

      const label = document.createElement('span');
      label.className = 'text-sm font-medium w-24';
      label.textContent = v.label;

      const skeleton = createSkeleton({
        variant: v.variant,
        width: v.width,
        height: v.height,
      });

      row.appendChild(label);
      row.appendChild(skeleton);
      container.appendChild(row);
    });

    return container;
  },
};

export const TextLines: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-2 w-full';

    // Heading
    container.appendChild(createSkeleton({ variant: 'heading' }));

    // Text lines with different widths for variety
    const widths = ['100%', '90%', '95%', '60%'];
    widths.forEach((width) => {
      const skeleton = createSkeleton({ variant: 'text', width });
      container.appendChild(skeleton);
    });

    return container;
  },
};

export const CardSkeleton: StoryObj = {
  render: () => {
    const card = document.createElement('div');
    card.className =
      'card bg-base-100 card-bordered border-base-300 p-8 shadow-premium rounded-xl w-full max-w-sm';

    const header = document.createElement('div');
    header.className = 'flex items-center gap-4 mb-6';

    // Circular avatar
    const avatar = createSkeleton({ variant: 'circular', width: '48px', height: '48px' });

    const titleSection = document.createElement('div');
    titleSection.className = 'flex flex-col gap-2 flex-1';
    titleSection.appendChild(createSkeleton({ variant: 'heading', width: '60%' }));
    titleSection.appendChild(createSkeleton({ variant: 'text', width: '40%' }));

    header.appendChild(avatar);
    header.appendChild(titleSection);
    card.appendChild(header);

    // Body content
    const body = document.createElement('div');
    body.className = 'flex flex-col gap-2';
    [100, 90, 70].forEach((width) => {
      body.appendChild(createSkeleton({ variant: 'text', width: `${width}%` }));
    });
    card.appendChild(body);

    // Button at bottom
    const actions = document.createElement('div');
    actions.className = 'mt-6';
    actions.appendChild(createSkeleton({ variant: 'button', width: '120px' }));
    card.appendChild(actions);

    return card;
  },
};

export const StatsRow: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex gap-6';

    const stats = [
      { label: 'Income', color: 'bg-success/20' },
      { label: 'Expense', color: 'bg-error/20' },
      { label: 'Balance', color: 'bg-primary/20' },
    ];

    stats.forEach((stat) => {
      const statDiv = document.createElement('div');
      statDiv.className = 'flex flex-col gap-2';

      const label = document.createElement('span');
      label.className = 'text-xs uppercase tracking-widest text-base-content/60';
      label.textContent = stat.label;

      const value = createSkeleton({ variant: 'heading', width: '100px' });

      statDiv.appendChild(label);
      statDiv.appendChild(value);
      container.appendChild(statDiv);
    });

    return container;
  },
};

export const InGrid: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl';

    for (let i = 0; i < 6; i++) {
      const card = document.createElement('div');
      card.className = 'bg-base-100 border border-base-300 rounded-xl p-6';

      const header = document.createElement('div');
      header.className = 'flex justify-between items-start mb-4';
      header.appendChild(createSkeleton({ variant: 'circular', width: '40px', height: '40px' }));
      header.appendChild(createSkeleton({ variant: 'button', width: '80px' }));

      const body = document.createElement('div');
      body.className = 'flex flex-col gap-2';
      body.appendChild(createSkeleton({ variant: 'heading', width: '70%' }));
      body.appendChild(createSkeleton({ variant: 'text', width: '50%' }));

      card.appendChild(header);
      card.appendChild(body);
      container.appendChild(card);
    }

    return container;
  },
};
