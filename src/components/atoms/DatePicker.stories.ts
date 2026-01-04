import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/DatePicker',
  tags: ['autodocs'],
  argTypes: {
    error: { control: 'boolean' },
    required: { control: 'boolean' },
  },
};

export default meta;

const createDatePicker = (args: {
  value?: string;
  min?: string;
  max?: string;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  required?: boolean;
}): HTMLElement => {
  const {
    value = '',
    min = '',
    max = '',
    error = false,
    errorMessage = 'Please select a valid date',
    label = 'Select Date',
    required = false,
  } = args;

  const container = document.createElement('div');
  container.className = 'form-control w-full max-w-xs';

  const labelEl = document.createElement('label');
  labelEl.className = 'label';
  labelEl.innerHTML = `<span class="label-text">${label}${required ? ' *' : ''}</span>`;
  container.appendChild(labelEl);

  const input = document.createElement('input');
  input.type = 'date';
  input.value = value;
  if (min) input.min = min;
  if (max) input.max = max;
  input.required = required;
  input.className = `input input-bordered w-full ${error ? 'input-error' : ''}`;
  if (error) input.setAttribute('aria-invalid', 'true');

  container.appendChild(input);

  if (error && errorMessage) {
    const errorSpan = document.createElement('span');
    errorSpan.className = 'text-error text-sm mt-1';
    errorSpan.textContent = errorMessage;
    errorSpan.setAttribute('role', 'alert');
    container.appendChild(errorSpan);
  }

  return container;
};

export const Default: StoryObj = {
  args: { label: 'Transaction Date' },
  render: (args) => createDatePicker(args),
};

export const WithValue: StoryObj = {
  args: { value: '2025-01-15', label: 'Transaction Date' },
  render: (args) => createDatePicker(args),
};

export const WithRange: StoryObj = {
  args: {
    label: 'Select a date this month',
    min: '2025-01-01',
    max: '2025-01-31',
  },
  render: (args) => createDatePicker(args),
};

export const Required: StoryObj = {
  args: { label: 'Due Date', required: true },
  render: (args) => createDatePicker(args),
};

export const Error: StoryObj = {
  args: {
    label: 'Transaction Date',
    error: true,
    errorMessage: 'Transaction date cannot be in the future',
  },
  render: (args) => createDatePicker(args),
};

export const ExpenseForm: StoryObj = {
  render: () => {
    const form = document.createElement('div');
    form.className = 'card bg-base-100 card-bordered p-6';

    const title = document.createElement('h3');
    title.className = 'card-title mb-4';
    title.textContent = 'Add Expense';

    const fields = document.createElement('div');
    fields.className = 'space-y-4';

    const dateInput = createDatePicker({
      label: 'Date',
      value: new Date().toISOString().split('T')[0],
    });

    fields.appendChild(dateInput);

    const amountGroup = document.createElement('div');
    amountGroup.className = 'form-control';
    amountGroup.innerHTML = `
      <label class="label">
        <span class="label-text">Amount</span>
      </label>
      <input type="number" placeholder="Enter amount" class="input input-bordered" />
    `;
    fields.appendChild(amountGroup);

    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'form-control';
    categoryGroup.innerHTML = `
      <label class="label">
        <span class="label-text">Category</span>
      </label>
      <select class="select select-bordered">
        <option value="">Select category...</option>
        <option value="food">Food & Dining</option>
        <option value="transport">Transportation</option>
        <option value="utilities">Utilities</option>
        <option value="entertainment">Entertainment</option>
      </select>
    `;
    fields.appendChild(categoryGroup);

    const actions = document.createElement('div');
    actions.className = 'card-actions justify-end mt-4';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save Expense';

    actions.appendChild(saveBtn);

    form.appendChild(title);
    form.appendChild(fields);
    form.appendChild(actions);

    return form;
  },
};
