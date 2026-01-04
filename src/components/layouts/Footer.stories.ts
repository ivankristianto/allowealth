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
  p.className = 'text-sm text-neutral-500';
  p.textContent = `© ${new Date().getFullYear()} Finance Manager. All rights reserved.`;

  footer.appendChild(p);

  return footer;
};

export const Default: StoryObj = {
  render: () => createFooter(),
};

export const WithinPage: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'min-h-screen flex flex-col';

    const main = document.createElement('main');
    main.className = 'flex-1 p-6';
    main.innerHTML = '<p class="text-center">Page content goes here...</p>';

    container.appendChild(main);
    container.appendChild(createFooter());

    return container;
  },
};
