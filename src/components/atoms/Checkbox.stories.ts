import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Checkbox',
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the checkbox',
    },
    label: {
      control: 'text',
      description: 'Checkbox label text',
    },
  },
};

export default meta;

const createCheckbox = (args: {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  name?: string;
}): HTMLElement => {
  const { checked = false, disabled = false, label = 'Checkbox label', name = 'checkbox' } = args;

  const container = document.createElement('div');
  container.className = 'form-control';

  const labelElement = document.createElement('label');
  labelElement.className = 'label cursor-pointer justify-start gap-2';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  input.checked = checked;
  input.disabled = disabled;
  input.className = 'checkbox checkbox-primary';

  const labelText = document.createElement('span');
  labelText.className = 'label-text';
  labelText.textContent = label;

  labelElement.appendChild(input);
  labelElement.appendChild(labelText);
  container.appendChild(labelElement);

  return container;
};

// Default (Unchecked)
export const Default: StoryObj = {
  args: {
    label: 'Accept terms and conditions',
    checked: false,
  },
  render: (args) => createCheckbox(args),
};

// Checked
export const Checked: StoryObj = {
  args: {
    label: 'I agree to the terms',
    checked: true,
  },
  render: (args) => createCheckbox(args),
};

// Disabled (Unchecked)
export const DisabledUnchecked: StoryObj = {
  args: {
    label: 'Disabled option',
    checked: false,
    disabled: true,
  },
  render: (args) => createCheckbox(args),
};

// Disabled (Checked)
export const DisabledChecked: StoryObj = {
  args: {
    label: 'Disabled checked option',
    checked: true,
    disabled: true,
  },
  render: (args) => createCheckbox(args),
};

// Remember Me
export const RememberMe: StoryObj = {
  args: {
    label: 'Remember me',
    checked: false,
    name: 'remember',
  },
  render: (args) => createCheckbox(args),
};

// Multiple Checkboxes
export const MultipleCheckboxes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-2';

    const options = [
      { label: 'Email notifications', checked: true },
      { label: 'SMS notifications', checked: false },
      { label: 'Push notifications', checked: true },
      { label: 'Newsletter subscription', checked: false },
    ];

    options.forEach((option) => {
      const checkbox = createCheckbox(option);
      container.appendChild(checkbox);
    });

    return container;
  },
};
