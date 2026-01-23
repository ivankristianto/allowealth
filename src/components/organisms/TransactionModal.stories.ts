import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Organisms/TransactionModal',
  tags: ['autodocs'],
  argTypes: {
    id: {
      control: 'text',
      description: 'Modal ID for DOM element',
    },
    title: {
      control: 'text',
      description: 'Modal title displayed in header',
    },
    open: {
      control: 'boolean',
      description: 'Whether modal is initially open',
    },
    action: {
      control: 'text',
      description: 'Form action URL',
    },
    method: {
      control: 'select',
      options: ['POST', 'PUT'],
      description: 'HTTP method for form submission',
    },
  },
};

export default meta;

const createTransactionModal = (args: {
  id?: string;
  title?: string;
  open?: boolean;
  action?: string;
  method?: 'POST' | 'PUT';
  values?: object;
}): HTMLElement => {
  const {
    id = 'transaction-modal',
    title = 'Add Transaction',
    open = false,
    action = '/api/transactions',
    method = 'POST',
    values = {},
  } = args;

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100 min-h-[500px]';

  const modal = document.createElement('dialog');
  modal.id = id;
  modal.className = 'modal';
  if (open) {
    modal.setAttribute('open', '');
  }

  const modalBox = document.createElement('div');
  modalBox.className = 'modal-box max-w-2xl';

  // Modal header
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-4';
  header.innerHTML = `
    <h3 class="font-bold text-lg">${title}</h3>
    <button class="btn btn-sm btn-circle btn-ghost" onclick="${id}.close()">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  // Form
  const form = document.createElement('form');
  form.method = method;
  form.action = action;
  form.className = 'space-y-4';

  // Transaction type
  const typeGroup = document.createElement('div');
  typeGroup.className = 'form-control';
  typeGroup.innerHTML = `
    <label class="label" for="transaction-type">
      <span class="label-text">Transaction Type</span>
    </label>
    <div class="flex gap-2">
      <label class="label cursor-pointer justify-start gap-2 border rounded-lg p-3 flex-1 hover:bg-base-200">
        <input type="radio" name="type" value="expense" class="radio radio-primary" ${(values as any).type === 'expense' ? 'checked' : ''} />
        <span class="label-text">Expense</span>
      </label>
      <label class="label cursor-pointer justify-start gap-2 border rounded-lg p-3 flex-1 hover:bg-base-200">
        <input type="radio" name="type" value="income" class="radio radio-primary" ${(values as any).type === 'income' ? 'checked' : ''} />
        <span class="label-text">Income</span>
      </label>
    </div>
  `;

  // Amount and Currency
  const amountGroup = document.createElement('div');
  amountGroup.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
  amountGroup.innerHTML = `
    <div class="form-control">
      <label class="label" for="amount">
        <span class="label-text">Amount</span>
      </label>
      <input
        type="number"
        id="amount"
        name="amount"
        class="input input-bordered w-full"
        placeholder="0"
        value="${(values as any).amount || ''}"
        required
        aria-required="true"
        step="0.01"
        min="0"
      />
    </div>
    <div class="form-control">
      <label class="label" for="currency">
        <span class="label-text">Currency</span>
      </label>
      <select id="currency" name="currency" class="select select-bordered w-full">
        <option value="IDR" ${(values as any).currency === 'IDR' ? 'selected' : ''}>IDR - Indonesian Rupiah</option>
        <option value="USD" ${(values as any).currency === 'USD' ? 'selected' : ''}>USD - US Dollar</option>
      </select>
    </div>
  `;

  // Category
  const categoryGroup = document.createElement('div');
  categoryGroup.className = 'form-control';
  categoryGroup.innerHTML = `
    <label class="label" for="category">
      <span class="label-text">Category</span>
    </label>
    <select id="category" name="category_id" class="select select-bordered w-full" required aria-required="true">
      <option value="">Select a category</option>
      <option value="1">Food & Groceries</option>
      <option value="2">Transportation</option>
      <option value="3">Entertainment</option>
      <option value="4">Salary</option>
      <option value="5">Investment</option>
    </select>
  `;

  // Payment Method
  const paymentGroup = document.createElement('div');
  paymentGroup.className = 'form-control';
  paymentGroup.innerHTML = `
    <label class="label" for="payment-method">
      <span class="label-text">Payment Method</span>
    </label>
    <select id="payment-method" name="payment_method_id" class="select select-bordered w-full" required aria-required="true">
      <option value="">Select payment method</option>
      <option value="1">Cash</option>
      <option value="2">Bank Transfer</option>
      <option value="3">Credit Card</option>
      <option value="4">E-Wallet</option>
    </select>
  `;

  // Date
  const dateGroup = document.createElement('div');
  dateGroup.className = 'form-control';
  dateGroup.innerHTML = `
    <label class="label" for="transaction-date">
      <span class="label-text">Date</span>
    </label>
    <input
      type="date"
      id="transaction-date"
      name="transaction_date"
      class="input input-bordered w-full"
      value="${(values as any).transaction_date || new Date().toISOString().split('T')[0]}"
      required
      aria-required="true"
    />
  `;

  // Description
  const descGroup = document.createElement('div');
  descGroup.className = 'form-control';
  descGroup.innerHTML = `
    <label class="label" for="description">
      <span class="label-text">Description (optional)</span>
    </label>
    <textarea
      id="description"
      name="description"
      class="textarea textarea-bordered w-full"
      rows="3"
      placeholder="Add notes about this transaction..."
    >${(values as any).description || ''}</textarea>
  `;

  // Form actions
  const actions = document.createElement('div');
  actions.className = 'modal-action';
  // Updated submit button to use btn-accent
  actions.innerHTML = `
    <a href="#" class="btn btn-ghost" onclick="document.getElementById('${id}').close(); return false;">Cancel</a>
    <button type="submit" class="btn btn-accent">${method === 'PUT' ? 'Update' : 'Save'} Transaction</button>
  `;

  form.append(typeGroup, amountGroup, categoryGroup, paymentGroup, dateGroup, descGroup, actions);
  modalBox.append(header, form);
  modal.appendChild(modalBox);

  // Backdrop
  const backdrop = document.createElement('form');
  backdrop.method = 'dialog';
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = '<button>close</button>';

  modal.appendChild(backdrop);
  container.appendChild(modal);

  // Add open button for demo - updated to use btn-accent
  const openButton = document.createElement('button');
  openButton.className = 'btn btn-accent mb-4';
  openButton.textContent = 'Open Modal';
  openButton.onclick = () => {
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    if (dialog) dialog.showModal();
  };
  container.insertBefore(openButton, modal);

  return container;
};

// Default state - Add new transaction
export const Default: StoryObj = {
  args: {
    id: 'transaction-modal',
    title: 'Add Transaction',
    open: false,
    action: '/api/transactions',
    method: 'POST',
    values: {},
  },
  render: (args) => createTransactionModal(args),
};

// Edit existing transaction
export const Edit: StoryObj = {
  args: {
    id: 'edit-transaction-modal',
    title: 'Edit Transaction',
    open: false,
    action: '/api/transactions/123',
    method: 'PUT',
    values: {
      type: 'expense',
      amount: '150000',
      currency: 'IDR',
      category_id: '1',
      payment_method_id: '2',
      transaction_date: '2026-01-10',
      description: 'Weekly grocery shopping',
    },
  },
  render: (args) => createTransactionModal(args),
};

// Add income
export const AddIncome: StoryObj = {
  args: {
    id: 'income-modal',
    title: 'Add Income',
    open: false,
    action: '/api/transactions',
    method: 'POST',
    values: {
      type: 'income',
      currency: 'USD',
    },
  },
  render: (args) => createTransactionModal(args),
};

// With form errors
export const WithErrors: StoryObj = {
  args: {
    id: 'error-modal',
    title: 'Add Transaction',
    open: false,
    action: '/api/transactions',
    method: 'POST',
    values: {
      type: 'expense',
      amount: '',
    },
  },
  render: (args) => {
    const container = createTransactionModal(args);
    // Simulate error states
    const amountInput = container.querySelector('#amount') as HTMLInputElement;
    if (amountInput) {
      amountInput.classList.add('input-error');
      const errorDiv = document.createElement('span');
      errorDiv.className = 'text-error text-sm mt-1';
      errorDiv.textContent = 'Please enter a valid amount';
      amountInput.parentElement?.appendChild(errorDiv);
    }
    const categorySelect = container.querySelector('#category') as HTMLSelectElement;
    if (categorySelect) {
      categorySelect.classList.add('select-error');
      const errorDiv = document.createElement('span');
      errorDiv.className = 'text-error text-sm mt-1';
      errorDiv.textContent = 'Please select a category';
      categorySelect.parentElement?.appendChild(errorDiv);
    }
    return container;
  },
};

// All states
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    const states = [
      { title: 'Add New Transaction', props: { title: 'Add Transaction', values: {} } },
      {
        title: 'Edit Expense Transaction',
        props: {
          title: 'Edit Transaction',
          method: 'PUT' as const,
          values: { type: 'expense', amount: '75000', currency: 'IDR' },
        },
      },
      {
        title: 'Add Income Transaction',
        props: { title: 'Add Income', values: { type: 'income' } },
      },
    ];

    states.forEach((state) => {
      const section = document.createElement('section');
      section.innerHTML = `<h3 class="text-lg font-semibold mb-4">${state.title}</h3>`;
      section.appendChild(createTransactionModal({ ...state.props }));
      container.appendChild(section);
    });

    return container;
  },
};
