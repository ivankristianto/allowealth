import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

Aligned with Oasis Finance v1.0.0 design system (Task 2.3).

| Property | Value | Class |
|----------|-------|-------|
| Height | 40px (2.5rem) | \`h-10\` |
| Padding Top/Bottom | 8px (0.5rem) | \`pt-2 pb-2\` |
| Padding Left | 12px (0.75rem) | \`pl-3\` |
| Padding Right | 40px (2.5rem) | \`pr-10\` (space for trailing icon) |
| Font Size | 12px (0.75rem) | \`text-xs\` |
| Border Radius | 8px | \`rounded-lg\` |
| Background | Theme-aware | \`bg-base-200\` |
| Focus Ring | 2px accent | \`focus-visible:ring-2 focus-visible:ring-accent\` |
| Error Border | Semantic error color | \`border-error\` / \`input-error\` |

### States

| State | Classes |
|-------|---------|
| Default | \`input input-bordered bg-base-200\` |
| Error | \`input-error border-error\` + \`aria-invalid="true"\` |
| Disabled | \`opacity-50 cursor-not-allowed\` |

### Accessibility

- **ARIA Support**: \`aria-invalid\` for error state, \`aria-describedby\` for descriptions
- **Label Association**: Proper \`htmlFor\` linking via \`id\` attribute
- **Error Announcement**: Error message with \`role="alert"\` and linked via \`aria-describedby\`
- **Keyboard Navigation**: Standard input keyboard interaction
- **Screen Reader**: Announces input type, placeholder, and current value

### Supported Types

- \`text\` (default)
- \`number\` (with min/max/step attributes)
- \`email\`
- \`date\`
- \`password\`
- \`select\` (renders as dropdown)
        `,
      },
    },
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'number', 'email', 'date'],
    },
    disabled: { control: 'boolean' },
    error: { control: 'boolean' },
  },
};

export default meta;

const createInput = (args: {
  type?: string;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  label?: string;
}): HTMLElement => {
  const {
    type = 'text',
    placeholder = 'Enter text...',
    value = '',
    disabled = false,
    error = false,
    errorMessage = 'This field is required',
    label = '',
  } = args;

  const container = document.createElement('div');
  container.className = 'form-control w-full';

  // Generate unique IDs for accessibility linkage
  const inputId = `input-${Math.random().toString(36).substring(2, 11)}`;
  const errorId = `${inputId}-error`;

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'label';
    labelEl.htmlFor = inputId;
    const labelText = document.createElement('span');
    labelText.className = 'label-text';
    labelText.textContent = label;
    labelEl.appendChild(labelText);
    container.appendChild(labelEl);
  }

  const input = document.createElement('input');
  input.id = inputId;
  input.type = type;
  input.placeholder = placeholder;
  input.value = value;
  input.disabled = disabled;
  // Styles aligned with Oasis Finance v1.0.0 design system (Task 2.3)
  // Height: h-10 (2.5rem/40px), Font size: text-xs (0.75rem/12px), Padding: pt-2 pb-2 pl-3 pr-10
  // Background: bg-base-200, Focus ring: 2px accent color with 2px offset
  input.className = `input input-bordered w-full h-10 rounded-lg border border-base-300 pt-2 pb-2 pl-3 pr-10 text-xs bg-base-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${error ? 'input-error border-error' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  if (error) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorId);
  }

  container.appendChild(input);

  if (error && errorMessage) {
    const errorSpan = document.createElement('span');
    errorSpan.id = errorId;
    errorSpan.className = 'text-error text-sm mt-1';
    errorSpan.textContent = errorMessage;
    errorSpan.setAttribute('role', 'alert');
    container.appendChild(errorSpan);
  }

  return container;
};

const createSelect = (args: {
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  label?: string;
  options?: Array<{ value: string; label: string }>;
}): HTMLElement => {
  const {
    placeholder = 'Select...',
    disabled = false,
    error = false,
    label = 'Category',
    options = [
      { value: 'food', label: 'Food & Dining' },
      { value: 'transport', label: 'Transportation' },
      { value: 'utilities', label: 'Utilities' },
      { value: 'entertainment', label: 'Entertainment' },
    ],
  } = args;

  const container = document.createElement('div');
  container.className = 'form-control w-full';

  const labelEl = document.createElement('label');
  labelEl.className = 'label';
  labelEl.innerHTML = `<span class="label-text">${label}</span>`;
  container.appendChild(labelEl);

  const select = document.createElement('select');
  // Styles aligned with Oasis Finance v1.0.0 design system (Task 2.3)
  // Height: h-10 (2.5rem/40px), Font size: text-xs (0.75rem/12px), Padding: pt-2 pb-2 pl-3 pr-10
  // Background: bg-base-200, Focus ring: 2px accent color with 2px offset
  select.className = `select select-bordered w-full h-10 rounded-lg border border-base-300 pt-2 pb-2 pl-3 pr-10 text-xs bg-base-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${error ? 'select-error border-error' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  select.disabled = disabled;

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = placeholder;
  select.appendChild(defaultOption);

  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });

  container.appendChild(select);
  return container;
};

export const Text: StoryObj = {
  args: {
    type: 'text',
    placeholder: 'Enter your name',
    label: 'Full Name',
  },
  render: (args) => createInput(args),
};

export const Email: StoryObj = {
  args: {
    type: 'email',
    placeholder: 'you@example.com',
    label: 'Email Address',
  },
  render: (args) => createInput(args),
};

export const Number: StoryObj = {
  args: {
    type: 'number',
    placeholder: '0',
    label: 'Amount',
  },
  render: (args) => createInput(args),
};

export const Date: StoryObj = {
  args: {
    type: 'date',
    label: 'Transaction Date',
  },
  render: (args) => createInput(args),
};

export const Select: StoryObj = {
  render: () => createSelect({}),
};

export const Error: StoryObj = {
  args: {
    type: 'text',
    label: 'Email Address',
    error: true,
    errorMessage: 'Please enter a valid email address',
  },
  render: (args) => createInput(args),
};

export const Disabled: StoryObj = {
  args: {
    type: 'text',
    value: 'Cannot edit this',
    disabled: true,
    label: 'Disabled Field',
  },
  render: (args) => createInput(args),
};

export const SelectError: StoryObj = {
  render: () => createSelect({ error: true, label: 'Category' }),
};

export const AllTypes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4 w-full max-w-md';

    const types = [
      { type: 'text', placeholder: 'Text input', label: 'Text' },
      { type: 'email', placeholder: 'Email input', label: 'Email' },
      { type: 'number', placeholder: 'Number input', label: 'Number' },
      { type: 'date', label: 'Date' },
    ];

    types.forEach((t) => {
      container.appendChild(createInput(t));
    });
    container.appendChild(createSelect({ label: 'Select' }));

    return container;
  },
};
