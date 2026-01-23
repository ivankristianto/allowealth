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
  wrapper.className = 'relative inline-block text-left';

  const label = document.createElement('label');
  label.setAttribute('for', 'currency-select');
  label.className = 'sr-only';
  label.textContent = 'Select currency';
  wrapper.appendChild(label);

  const select = document.createElement('select');
  select.id = 'currency-select';
  select.name = 'currency';
  select.className =
    'block w-full pl-4 pr-10 py-2 text-base font-medium border-base-300 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent rounded-xl bg-base-100 text-base-content appearance-none cursor-pointer shadow-sm hover:bg-base-200 transition-colors';
  select.setAttribute('aria-label', 'Currency selector');

  currencies.forEach((currency) => {
    const option = document.createElement('option');
    option.value = currency;
    option.textContent = currencyLabels[currency];
    if (currency === selectedCurrency) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  wrapper.appendChild(select);

  const iconWrapper = document.createElement('div');
  iconWrapper.className =
    'pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral';
  iconWrapper.setAttribute('aria-hidden', 'true');
  iconWrapper.appendChild(ChevronDown.render({ size: 20, class: 'stroke-current' }));

  wrapper.appendChild(iconWrapper);
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
        story: 'Default currency selector with IDR selected as default.',
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
        story: 'Currency selector with USD selected.',
      },
    },
  },
};

export const OnlyIDR: StoryObj = {
  args: {
    selectedCurrency: 'IDR',
    currencies: ['IDR'],
  },
  render: (args) => createCurrencySelector(args),
  parameters: {
    docs: {
      description: {
        story: 'Currency selector with only IDR available.',
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
        story: 'Currency selector in dark mode.',
      },
    },
  },
};
