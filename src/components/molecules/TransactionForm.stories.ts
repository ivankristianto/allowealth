import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/TransactionForm',
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'select',
      options: ['create', 'edit'],
    },
    type: {
      control: 'select',
      options: ['expense', 'income'],
    },
  },
};

export default meta;

const createTransactionForm = (args: {
  mode?: 'create' | 'edit';
  type?: 'expense' | 'income';
}): HTMLElement => {
  const { mode = 'create', type = 'expense' } = args;

  const wrapper = document.createElement('div');
  wrapper.className = 'max-w-2xl';

  const form = document.createElement('form');
  form.className = 'space-y-6';

  // Transaction Type Toggle
  const typeToggle = document.createElement('div');
  typeToggle.className = 'flex gap-2';
  typeToggle.innerHTML = `
    <label class="label cursor-pointer justify-start gap-2">
      <input type="radio" name="type" value="expense" class="radio radio-primary" ${type === 'expense' ? 'checked' : ''} />
      <span class="label-text">Expense</span>
    </label>
    <label class="label cursor-pointer justify-start gap-2">
      <input type="radio" name="type" value="income" class="radio radio-primary" ${type === 'income' ? 'checked' : ''} />
      <span class="label-text">Income</span>
    </label>
  `;
  form.appendChild(typeToggle);

  // Amount Field
  const amountGroup = document.createElement('div');
  amountGroup.className = 'form-control';
  amountGroup.innerHTML = `
    <label class="label">
      <span class="label-text">Amount</span>
      <span class="label-text-alt text-error">*</span>
    </label>
    <div class="join">
      <select class="select select-bordered join-item">
        <option value="IDR" ${type === 'expense' ? 'selected' : ''}>IDR</option>
        <option value="USD">USD</option>
      </select>
      <input type="number" name="amount" placeholder="0.00" class="input input-bordered join-item flex-1" required min="0" step="0.01" />
    </div>
  `;
  form.appendChild(amountGroup);

  // Category Field
  const categoryGroup = document.createElement('div');
  categoryGroup.className = 'form-control';
  categoryGroup.innerHTML = `
    <label class="label">
      <span class="label-text">Category</span>
      <span class="label-text-alt text-error">*</span>
    </label>
    <select name="category_id" class="select select-bordered" required>
      <option value="">Select category...</option>
      <option value="1">Food & Dining</option>
      <option value="2">Transportation</option>
      <option value="3">Entertainment</option>
      <option value="4">Shopping</option>
      <option value="5">Bills & Utilities</option>
    </select>
  `;
  form.appendChild(categoryGroup);

  // Payment Method Field
  const paymentGroup = document.createElement('div');
  paymentGroup.className = 'form-control';
  paymentGroup.innerHTML = `
    <label class="label">
      <span class="label-text">Payment Method</span>
      <span class="label-text-alt text-error">*</span>
    </label>
    <select name="payment_method_id" class="select select-bordered" required>
      <option value="">Select payment method...</option>
      <option value="1">Cash</option>
      <option value="2">Credit Card</option>
      <option value="3">Debit Card</option>
      <option value="4">Bank Transfer</option>
    </select>
  `;
  form.appendChild(paymentGroup);

  // Date Field
  const dateGroup = document.createElement('div');
  dateGroup.className = 'form-control';
  dateGroup.innerHTML = `
    <label class="label">
      <span class="label-text">Date</span>
      <span class="label-text-alt text-error">*</span>
    </label>
    <input type="date" name="transaction_date" class="input input-bordered" required value="${new Date().toISOString().split('T')[0]}" max="${new Date().toISOString().split('T')[0]}" />
  `;
  form.appendChild(dateGroup);

  // Description Field
  const descGroup = document.createElement('div');
  descGroup.className = 'form-control';
  descGroup.innerHTML = `
    <label class="label">
      <span class="label-text">Description</span>
      <span class="label-text-alt">Optional</span>
    </label>
    <textarea name="description" class="textarea textarea-bordered" rows="3" placeholder="Add a note about this transaction..." maxlength="500"></textarea>
    <label class="label">
      <span class="label-text-alt">0/500 characters</span>
    </label>
  `;
  form.appendChild(descGroup);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'flex gap-3 justify-end';
  actions.innerHTML = `
    <button type="button" class="btn btn-ghost">Cancel</button>
    <button type="submit" class="btn btn-primary">${mode === 'create' ? 'Add Transaction' : 'Save Changes'}</button>
  `;
  form.appendChild(actions);

  wrapper.appendChild(form);

  return wrapper;
};

export const CreateExpense: StoryObj = {
  args: { mode: 'create', type: 'expense' },
  render: (args) => createTransactionForm(args),
};

export const CreateIncome: StoryObj = {
  args: { mode: 'create', type: 'income' },
  render: (args) => createTransactionForm(args),
};

export const EditMode: StoryObj = {
  args: { mode: 'edit', type: 'expense' },
  render: (args) => createTransactionForm(args),
};
