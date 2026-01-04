import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Icon',
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: [
        'arrow-left',
        'arrow-right',
        'check',
        'x',
        'plus',
        'minus',
        'pencil',
        'trash',
        'search',
        'calendar',
        'chevron-down',
        'chevron-up',
        'information',
        'warning',
        'currency-dollar',
        'home',
      ],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;

const createIcon = (args: { name?: string; size?: string }): HTMLElement => {
  const { name = 'check', size = 'md' } = args;

  const sizeClasses: Record<string, string> = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const icons: Record<string, { viewBox: string; path: string }> = {
    'arrow-left': {
      viewBox: '0 0 20 20',
      path: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z',
    },
    'arrow-right': {
      viewBox: '0 0 20 20',
      path: 'M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z',
    },
    check: {
      viewBox: '0 0 20 20',
      path: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
    },
    x: {
      viewBox: '0 0 20 20',
      path: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z',
    },
    plus: {
      viewBox: '0 0 20 20',
      path: 'M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z',
    },
    minus: {
      viewBox: '0 0 20 20',
      path: 'M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z',
    },
    pencil: {
      viewBox: '0 0 20 20',
      path: 'M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z',
    },
    trash: {
      viewBox: '0 0 20 20',
      path: 'M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z',
    },
    search: {
      viewBox: '0 0 20 20',
      path: 'M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z',
    },
    calendar: {
      viewBox: '0 0 20 20',
      path: 'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z',
    },
    'chevron-down': {
      viewBox: '0 0 20 20',
      path: 'M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z',
    },
    'chevron-up': {
      viewBox: '0 0 20 20',
      path: 'M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z',
    },
    information: {
      viewBox: '0 0 20 20',
      path: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
    },
    warning: {
      viewBox: '0 0 20 20',
      path: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.7 6.3a1 1 0 112.6 0v4.4a1 1 0 11-2.6 0V6.3zm1.3 8.7a1 1 0 100-2 1 1 0 000 2z',
    },
    'currency-dollar': {
      viewBox: '0 0 20 20',
      path: 'M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2h1a1 1 0 100 2H7zm3 4a1 1 0 100-2h-1a1 1 0 100 2h1zm-3-1a1 1 0 011-1h2a1 1 0 110 2H8a1 1 0 01-1-1z',
    },
    home: {
      viewBox: '0 0 20 20',
      path: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z',
    },
  };

  const icon = icons[name] || icons['information'];

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', sizeClasses[size]);
  svg.setAttribute('viewBox', icon.viewBox);
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill-rule', 'evenodd');
  path.setAttribute('d', icon.path);
  path.setAttribute('clip-rule', 'evenodd');

  svg.appendChild(path);
  return svg;
};

export const Default: StoryObj = {
  args: { name: 'check', size: 'md' },
  render: (args) => createIcon(args),
};

export const Check: StoryObj = {
  args: { name: 'check' },
  render: (args) => createIcon(args),
};

export const X: StoryObj = {
  args: { name: 'x' },
  render: (args) => createIcon(args),
};

export const Plus: StoryObj = {
  args: { name: 'plus' },
  render: (args) => createIcon(args),
};

export const Pencil: StoryObj = {
  args: { name: 'pencil' },
  render: (args) => createIcon(args),
};

export const Trash: StoryObj = {
  args: { name: 'trash' },
  render: (args) => createIcon(args),
};

export const Search: StoryObj = {
  args: { name: 'search' },
  render: (args) => createIcon(args),
};

export const AllSizes: StoryObj = {
  args: { name: 'check' },
  render: (args) => {
    const container = document.createElement('div');
    container.className = 'flex items-center gap-4';

    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

    sizes.forEach((size) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col items-center gap-1';

      const icon = createIcon({ ...args, size });
      const label = document.createElement('span');
      label.className = 'text-xs text-neutral-500';
      label.textContent = size;

      wrapper.appendChild(icon);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });

    return container;
  },
};

export const CommonIcons: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-wrap gap-4';

    const icons = ['check', 'x', 'plus', 'minus', 'pencil', 'trash', 'search', 'calendar'] as const;

    icons.forEach((name) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col items-center gap-1';

      const icon = createIcon({ name, size: 'md' });
      const label = document.createElement('span');
      label.className = 'text-xs text-neutral-500';
      label.textContent = name;

      wrapper.appendChild(icon);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });

    return container;
  },
};

export const WithButton: StoryObj = {
  render: () => {
    const button = document.createElement('button');
    button.className = 'btn btn-primary';

    const svg = createIcon({ name: 'plus', size: 'sm' });
    const text = document.createTextNode(' Add Item');

    button.appendChild(svg);
    button.appendChild(text);

    return button;
  },
};
