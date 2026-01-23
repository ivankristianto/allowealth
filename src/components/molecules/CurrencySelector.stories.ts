import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { ChevronDown } = IconRenderers;

const meta: Meta = {
  title: 'Molecules/CurrencySelector',
  tags: ['autodocs'],
  argTypes: {
    selectedCurrency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currently selected currency',
    },
    currencies: {
      control: 'object',
      description: 'Available currency options',
    },
  },
};

export default meta;

const createCurrencySelector = (args: {
  selectedCurrency?: 'IDR' | 'USD';
  currencies?: Array<'IDR' | 'USD'>;
}): HTMLElement => {
  const { selectedCurrency = 'IDR', currencies = ['IDR', 'USD'] } = args;

  const currencyLabels: Record<string, string> = {
    IDR: 'IDR (Default)',
    USD: 'USD',
  };

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100';

  const wrapper = document.createElement('div');
  wrapper.className = 'dropdown dropdown-end';

  // Button - simple minimalist design
  const button = document.createElement('button');
  button.tabIndex = 0;
  button.className =
    'px-4 py-2 text-sm font-medium border border-base-300 bg-base-100 text-base-content rounded-xl hover:bg-base-200 transition-colors shadow-sm flex items-center gap-2';
  button.setAttribute('aria-label', 'Currency selector');

  const buttonText = document.createElement('span');
  buttonText.className = 'text-base-content';
  buttonText.textContent = currencyLabels[selectedCurrency];
  button.appendChild(buttonText);

  const chevron = document.createElement('div');
  chevron.appendChild(
    ChevronDown.render({
      size: 14,
      class: 'stroke-current text-neutral shrink-0',
      'aria-hidden': 'true',
    })
  );
  button.appendChild(chevron);

  wrapper.appendChild(button);

  // Dropdown menu - matching UserContext style
  const menu = document.createElement('ul');
  menu.tabIndex = 0;
  menu.className =
    'dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300';

  currencies.forEach((currency) => {
    const li = document.createElement('li');

    const itemButton = document.createElement('button');
    itemButton.className = 'flex items-center gap-2 w-full text-left hover:bg-base-200 rounded-btn';
    itemButton.setAttribute('data-currency', currency);
    itemButton.type = 'button';

    const itemSpan = document.createElement('span');
    itemSpan.className = 'text-base-content';
    itemSpan.textContent = currencyLabels[currency];
    itemButton.appendChild(itemSpan);

    if (currency === selectedCurrency) {
      const checkmark = document.createElement('span');
      checkmark.className = 'ml-auto text-accent text-xs';
      checkmark.textContent = '✓';
      itemButton.appendChild(checkmark);
    }

    li.appendChild(itemButton);
    menu.appendChild(li);
  });

  wrapper.appendChild(menu);
  container.appendChild(wrapper);

  return container;
};

export const Default: StoryObj = {
  args: {
    selectedCurrency: 'IDR',
  },
  render: (args) => createCurrencySelector(args),
  parameters: {
    docs: {
      description: {
        story:
          'Default currency selector with IDR selected. Simple minimalist button design with light border, white background, and subtle shadow.',
      },
    },
  },
};

export const USDSelected: StoryObj = {
  args: {
    selectedCurrency: 'USD',
  },
  render: (args) => createCurrencySelector(args),
  parameters: {
    docs: {
      description: {
        story: 'Currency selector with USD selected and checkmark indicator.',
      },
    },
  },
};

export const DarkMode: StoryObj = {
  args: {
    selectedCurrency: 'IDR',
  },
  render: (args) => createCurrencySelector(args),
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Currency selector in dark mode with theme-aware styling.',
      },
    },
  },
};
