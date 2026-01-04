import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Layouts/PageContainer',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
  },
};

export default meta;

const createPageContainer = (args: { size?: string }): HTMLElement => {
  const { size = 'lg' } = args;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };

  const container = document.createElement('div');
  container.className = `${sizeClasses[size]} mx-auto w-full p-6`;

  container.innerHTML = `
    <div class="card bg-base-100 card-bordered p-6">
      <h2 class="text-xl font-bold mb-4">Page Content (${size})</h2>
      <p class="text-neutral-600">This content is contained within a ${size} page container with max-width of ${sizeClasses[size]}.</p>
    </div>
  `;

  return container;
};

export const Small: StoryObj = {
  args: { size: 'sm' },
  render: (args) => createPageContainer(args),
};

export const Medium: StoryObj = {
  args: { size: 'md' },
  render: (args) => createPageContainer(args),
};

export const Large: StoryObj = {
  args: { size: 'lg' },
  render: (args) => createPageContainer(args),
};

export const XLarge: StoryObj = {
  args: { size: 'xl' },
  render: (args) => createPageContainer(args),
};

export const Full: StoryObj = {
  args: { size: 'full' },
  render: (args) => createPageContainer(args),
};

export const Comparison: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8 p-6';

    const sizes = ['sm', 'md', 'lg', 'xl'] as const;

    sizes.forEach((size) => {
      const section = document.createElement('div');
      section.className = `${{ sm: 'max-w-2xl', md: 'max-w-4xl', lg: 'max-w-6xl', xl: 'max-w-7xl' }[size]} mx-auto`;

      const sizeClass = { sm: 'max-w-2xl', md: 'max-w-4xl', lg: 'max-w-6xl', xl: 'max-w-7xl' }[
        size
      ];

      section.innerHTML = `
        <div class="card bg-base-100 card-bordered p-4">
          <h3 class="font-bold mb-2">${size.toUpperCase()} Container</h3>
          <p class="text-sm text-neutral-500">Max-width: ${sizeClass}</p>
        </div>
      `;

      container.appendChild(section);
    });

    return container;
  },
};
