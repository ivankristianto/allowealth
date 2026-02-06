import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/AssetSelect',
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    helpText: { control: 'text' },
    value: { control: 'text' },
    required: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;

const mockAssets = [
  { id: 'asset-1', name: 'BCA Savings', type: 'bank_account' },
  { id: 'asset-2', name: 'Cash Wallet', type: 'other' },
  { id: 'asset-3', name: 'Mandiri Checking', type: 'bank_account' },
];

const createAssetSelect = (args: {
  label?: string;
  helpText?: string;
  value?: string;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
}): HTMLElement => {
  const {
    label = 'Asset',
    helpText = 'Choose the account used for this transaction.',
    value = '',
    required = false,
    error = false,
    errorMessage = 'Please select an asset.',
    disabled = false,
  } = args;

  const container = document.createElement('div');
  container.className = 'form-control w-full max-w-sm';

  const inputId = `asset-select-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'label py-1';
    labelEl.htmlFor = inputId;
    const labelText = document.createElement('span');
    labelText.className = 'text-xs uppercase tracking-widest text-base-content/50 font-medium';
    labelText.textContent = label;
    labelEl.appendChild(labelText);

    if (helpText) {
      const help = document.createElement('span');
      help.className = 'label-text-alt text-neutral';
      help.textContent = helpText;
      labelEl.appendChild(help);
    }

    container.appendChild(labelEl);
  }

  const select = document.createElement('select');
  select.id = inputId;
  select.name = 'asset_id';
  select.required = required;
  select.disabled = disabled;
  select.className = [
    'select select-bordered w-full',
    'h-14',
    'py-4 pl-6 pr-10',
    'text-base font-bold',
    'bg-base-200',
    'rounded-lg border border-base-300',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
    error ? 'select-error border-error' : '',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ');
  select.setAttribute('aria-invalid', error ? 'true' : 'false');
  if (error) {
    select.setAttribute('aria-describedby', errorId);
  }

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select account...';
  select.appendChild(placeholder);

  mockAssets.forEach((asset) => {
    const option = document.createElement('option');
    option.value = asset.id;
    option.textContent = asset.name;
    if (asset.id === value) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  container.appendChild(select);

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
  render: (args) => createAssetSelect(args),
};

export const WithValue: StoryObj = {
  args: { value: 'asset-2' },
  render: (args) => createAssetSelect(args),
};

export const ErrorState: StoryObj = {
  args: { error: true },
  render: (args) => createAssetSelect(args),
};

ErrorState.storyName = 'Error';

export const Disabled: StoryObj = {
  args: { disabled: true, value: 'asset-1' },
  render: (args) => createAssetSelect(args),
};
