import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/CategorySelect',
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    helpText: { control: 'text' },
    type: { control: 'select', options: ['expense', 'income'] },
    value: { control: 'text' },
    required: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;

const mockCategories = [
  { id: 'cat-1', name: 'Groceries', type: 'expense' },
  { id: 'cat-2', name: 'Dining', type: 'expense' },
  { id: 'cat-3', name: 'Salary', type: 'income' },
  { id: 'cat-4', name: 'Freelance', type: 'income' },
];

const createCategorySelect = (args: {
  label?: string;
  helpText?: string;
  value?: string;
  type?: 'expense' | 'income';
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
}): HTMLElement => {
  const {
    label = 'Category',
    helpText = 'Select a category for this transaction.',
    value = '',
    type = undefined,
    required = false,
    error = false,
    errorMessage = 'Please select a category.',
    disabled = false,
  } = args;

  const container = document.createElement('div');
  container.className = 'form-control w-full max-w-sm';

  const inputId = `category-select-${Math.random().toString(36).slice(2, 9)}`;
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

  const filtered = type ? mockCategories.filter((cat) => cat.type === type) : mockCategories;

  const select = document.createElement('select');
  select.id = inputId;
  select.name = 'category_id';
  select.required = required;
  select.disabled = disabled;
  select.className = [
    'select select-bordered w-full',
    'h-14',
    'py-4 pl-6 pr-10',
    'text-base font-bold',
    'bg-base-200',
    'rounded-full border-0',
    'focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none focus:ring-offset-2',
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
  placeholder.textContent = 'Select category...';
  select.appendChild(placeholder);

  filtered.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    if (category.id === value) {
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
  render: (args) => createCategorySelect(args),
};

export const ExpenseOnly: StoryObj = {
  args: { type: 'expense' },
  render: (args) => createCategorySelect(args),
};

export const IncomeOnly: StoryObj = {
  args: { type: 'income' },
  render: (args) => createCategorySelect(args),
};

export const ErrorState: StoryObj = {
  args: { error: true },
  render: (args) => createCategorySelect(args),
};

ErrorState.storyName = 'Error';

export const Disabled: StoryObj = {
  args: { disabled: true, value: 'cat-1' },
  render: (args) => createCategorySelect(args),
};
