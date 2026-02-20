import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/CurrencyInput',
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    currency: { control: 'select', options: ['IDR', 'USD'] },
    required: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;

const createCurrencyInput = (args: {
  label?: string;
  value?: string;
  currency?: Currency;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
}): HTMLElement => {
  const {
    label = 'Amount',
    value = '',
    currency = 'IDR',
    required = false,
    error = false,
    errorMessage = 'Please enter a valid amount.',
    disabled = false,
  } = args;

  const container = document.createElement('div');
  container.className = 'form-control w-full max-w-sm';

  const inputId = `currency-input-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'label py-1';
    labelEl.htmlFor = inputId;
    const labelText = document.createElement('span');
    labelText.className = 'text-xs uppercase tracking-widest text-base-content/50 font-medium';
    labelText.textContent = label;
    labelEl.appendChild(labelText);
    container.appendChild(labelEl);
  }

  const join = document.createElement('div');
  join.className = 'join w-full rounded-lg';

  const currencySelect = document.createElement('select');
  currencySelect.className =
    'select select-bordered join-item h-14 w-20 min-w-20 rounded-l-lg border border-base-300 bg-base-200 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';
  currencySelect.disabled = disabled;
  currencySelect.setAttribute('aria-label', 'Currency');

  ['IDR', 'USD'].forEach((code) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = code;
    if (code === currency) option.selected = true;
    currencySelect.appendChild(option);
  });

  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.id = inputId;
  amountInput.value = value;
  amountInput.step = '0.01';
  amountInput.min = '0.01';
  amountInput.required = required;
  amountInput.disabled = disabled;
  amountInput.placeholder = '0.00';
  amountInput.className = [
    'input input-bordered join-item w-full h-14 rounded-r-lg border border-base-300 bg-base-200 text-base font-bold',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
    error ? 'input-error' : '',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ');
  amountInput.setAttribute('aria-invalid', error ? 'true' : 'false');
  if (error) {
    amountInput.setAttribute('aria-describedby', errorId);
  }

  join.appendChild(currencySelect);
  join.appendChild(amountInput);
  container.appendChild(join);

  if (error && errorMessage) {
    const errorSpan = document.createElement('span');
    errorSpan.id = errorId;
    errorSpan.className = 'text-error text-sm mt-1';
    errorSpan.setAttribute('role', 'alert');
    errorSpan.textContent = errorMessage;
    container.appendChild(errorSpan);
  }

  return container;
};

export const Default: StoryObj = {
  render: (args) => createCurrencyInput(args),
};

export const USD: StoryObj = {
  args: { currency: 'USD', value: '1250' },
  render: (args) => createCurrencyInput(args),
};

export const ErrorState: StoryObj = {
  args: { error: true },
  render: (args) => createCurrencyInput(args),
};

ErrorState.storyName = 'Error';

export const Disabled: StoryObj = {
  args: { disabled: true, value: '250000' },
  render: (args) => createCurrencyInput(args),
};
