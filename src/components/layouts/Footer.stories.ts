import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Layouts/Footer',
  tags: ['autodocs'],
};

export default meta;

const createFooter = (): HTMLElement => {
  const footer = document.createElement('footer');
  footer.className = 'bg-base-100 border-t border-base-300 px-4 py-3 text-center';

  const p = document.createElement('p');
  // Updated to use DaisyUI semantic color with opacity variant
  p.className = 'text-sm text-base-content/60';
  p.textContent = `© ${new Date().getFullYear()} Finance Manager. All rights reserved.`;

  footer.appendChild(p);

  return footer;
};

export const Default: StoryObj = {
  render: () => createFooter(),
  parameters: {
    docs: {
      description: {
        story:
          'Footer component with base-content text color at 60% opacity for secondary text visibility.',
      },
    },
  },
};

export const WithinPage: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'min-h-screen flex flex-col';

    const main = document.createElement('main');
    main.className = 'flex-1 p-6';
    main.innerHTML = '<p class="text-center text-base-content">Page content goes here...</p>';

    container.appendChild(main);
    container.appendChild(createFooter());

    return container;
  },
  parameters: {
    docs: {
      description: {
        story: 'Footer displayed at the bottom of a page layout with content above.',
      },
    },
  },
};
