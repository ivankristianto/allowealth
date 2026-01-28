import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/TransactionForm',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Warning Icon | 16px | \`TriangleAlert size={16}\` |
| Success Icon | 24px | \`Check size={24}\` |
| Form Gap | 16px | \`flex flex-col gap-4\` |
| Input Height | 40px | \`h-10\` |
| Input Padding | 8px 12px | \`pt-2 pb-2 pl-3 pr-10\` |
| Font Size | text-xs | Small text in inputs |
| Background | bg-base-200 | Input background |
| Focus Ring | ring-accent | \`focus:ring-2 focus:ring-accent focus:ring-opacity-20\` |

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Type | Radio toggle | Yes | expense or income |
| Amount | Number input | Yes | min=0, step=0.01 |
| Category | Select | Yes | Must select |
| Asset | Select | Yes | Must select |
| Date | Date picker | Yes | max=today |
| Description | Textarea | No | maxlength=500 |

### Client-Side Features
- Validation on blur
- Visual feedback with TriangleAlert icon for errors
- Character counter for description
- Loading states for submit button

### Action Buttons
- Cancel: \`btn btn-ghost text-accent hover:bg-accent/5\`
- Submit: \`btn btn-accent shadow-accent-glow\`
- Button height: \`h-10 px-5 py-2.5 text-sm\`
- Focus: \`focus:ring-2 focus:ring-offset-2 focus:ring-accent\`

### Accessibility
- \`role="radiogroup"\` on type toggle
- Labels with required indicators
- \`aria-describedby\` for field descriptions
- Error messages associated with inputs

### Props
- **mode**: create | edit (changes submit button text)
- **type**: expense | income (default type selection)
- **transaction**: Optional transaction data for edit mode
        `,
      },
    },
  },
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
  form.className = 'flex flex-col gap-4';

  // Transaction Type Toggle
  const typeToggle = document.createElement('div');
  typeToggle.className = 'join w-full';
  typeToggle.innerHTML = `
    <input
      type="radio"
      name="type"
      value="expense"
      id="type-expense-story"
      class="join-item btn h-10 px-5 py-2.5 text-sm flex-1"
      ${type === 'expense' ? 'checked' : ''}
    />
    <label for="type-expense-story" class="join-item btn h-10 px-5 py-2.5 text-sm flex-1">Expense</label>
    <input
      type="radio"
      name="type"
      value="income"
      id="type-income-story"
      class="join-item btn h-10 px-5 py-2.5 text-sm flex-1"
      ${type === 'income' ? 'checked' : ''}
    />
    <label for="type-income-story" class="join-item btn h-10 px-5 py-2.5 text-sm flex-1">Income</label>
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
      <select class="select select-bordered join-item h-10 pt-2 pb-2 pl-3 pr-10 text-xs bg-base-200 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none focus:ring-offset-2">
        <option value="IDR" ${type === 'expense' ? 'selected' : ''}>IDR</option>
        <option value="USD">USD</option>
      </select>
      <input type="number" name="amount" placeholder="0.00" class="input input-bordered join-item flex-1 h-10 pt-2 pb-2 pl-3 pr-10 text-xs bg-base-200 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none" required min="0" step="0.01" />
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
    <select name="category_id" class="select select-bordered w-full h-10 pt-2 pb-2 pl-3 pr-10 text-xs bg-base-200 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none focus:ring-offset-2" required>
      <option value="">Select category...</option>
      <option value="1">Food & Dining</option>
      <option value="2">Transportation</option>
      <option value="3">Entertainment</option>
      <option value="4">Shopping</option>
      <option value="5">Bills & Utilities</option>
    </select>
  `;
  form.appendChild(categoryGroup);

  // Asset Field
  const assetGroup = document.createElement('div');
  assetGroup.className = 'form-control';
  assetGroup.innerHTML = `
    <label class="label">
      <span class="label-text">Asset</span>
      <span class="label-text-alt text-error">*</span>
    </label>
    <select name="asset_id" class="select select-bordered w-full h-10 pt-2 pb-2 pl-3 pr-10 text-xs bg-base-200 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none focus:ring-offset-2" required>
      <option value="">Select asset...</option>
      <option value="1">Cash</option>
      <option value="2">BCA Savings</option>
      <option value="3">Mandiri Checking</option>
      <option value="4">GoPay</option>
    </select>
  `;
  form.appendChild(assetGroup);

  // Date Field
  const dateGroup = document.createElement('div');
  dateGroup.className = 'form-control';
  dateGroup.innerHTML = `
    <label class="label">
      <span class="label-text">Date</span>
      <span class="label-text-alt text-error">*</span>
    </label>
    <input type="date" name="transaction_date" class="input input-bordered w-full h-10 bg-base-200 text-xs focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none" required value="${new Date().toISOString().split('T')[0]}" max="${new Date().toISOString().split('T')[0]}" />
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
    <textarea name="description" class="textarea textarea-bordered w-full bg-base-200 text-xs pt-2 pb-2 px-3 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none" rows="3" placeholder="Add a note about this transaction..." maxlength="500"></textarea>
    <label class="label">
      <span class="label-text-alt">0/500 characters</span>
    </label>
  `;
  form.appendChild(descGroup);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'flex gap-3 justify-end';
  actions.innerHTML = `
    <button type="button" class="btn btn-ghost text-accent hover:bg-accent/5 h-10 px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent">Cancel</button>
    <button type="submit" class="btn btn-accent shadow-accent-glow h-10 px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent">${mode === 'create' ? 'Add Transaction' : 'Save Changes'}</button>
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
