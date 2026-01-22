import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Layouts/PageContainer',
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
  },
};

export default meta;

const createPageContainer = (args: { className?: string }): HTMLElement => {
  const { className = '' } = args;

  const container = document.createElement('div');
  // Matches the component's actual implementation:
  // - Uses container-app class (max-width: 1400px via CSS variable)
  // - Responsive padding: px-6 lg:px-12
  // - Centered with mx-auto
  container.className = `container-app mx-auto px-6 lg:px-12 w-full ${className}`;

  // Demo content
  container.innerHTML = `
    <div class="card bg-base-100 card-bordered p-6">
      <h2 class="text-xl font-bold mb-4">Page Content</h2>
      <p class="text-base-content">This content is contained within the PageContainer component.</p>
      <p class="text-sm text-base-content/70 mt-2">Max-width: 1400px (via container-app token)</p>
      <p class="text-sm text-base-content/70">Padding: 1.5rem mobile / 3rem desktop</p>
    </div>
  `;

  return container;
};

export const Default: StoryObj = {
  args: {},
  render: (args) => createPageContainer(args),
};

export const WithCustomClass: StoryObj = {
  args: { className: 'py-12' },
  render: (args) => createPageContainer(args),
};

export const ResponsiveDemo: StoryObj = {
  render: () => {
    const wrapper = document.createElement('div');

    // Show the container at different viewport sizes
    const demoContent = `
      <div class="space-y-4 p-4 bg-base-200">
        <div class="text-center py-8">
          <h3 class="text-lg font-bold mb-2">Responsive Page Container Demo</h3>
          <p class="text-sm text-base-content/70 mb-4">Resize your browser to see responsive padding</p>
          <div class="badge badge-accent">Mobile: 1.5rem padding</div>
          <div class="badge badge-accent ml-2">Desktop (lg+): 3rem padding</div>
        </div>
      </div>
    `;

    wrapper.innerHTML = demoContent;

    const container = document.createElement('div');
    container.className = 'container-app mx-auto px-6 lg:px-12 w-full';
    container.innerHTML = demoContent;

    wrapper.appendChild(container);

    return wrapper;
  },
};
