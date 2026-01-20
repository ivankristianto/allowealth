import type { Meta, StoryObj } from '@storybook/html';
import { X } from '@lucide/astro';

const meta: Meta = {
  title: 'Molecules/Modal',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    closable: { control: 'boolean' },
    backdropClose: { control: 'boolean' },
  },
};

export default meta;

const createModal = (args: {
  title?: string;
  size?: string;
  closable?: boolean;
  backdropClose?: boolean;
}): { wrapper: HTMLElement; openBtn: HTMLElement } => {
  const { title = 'Modal Title', size = 'md', closable = true, backdropClose = true } = args;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const wrapper = document.createElement('div');
  wrapper.className = 'relative';

  // Open button
  const openBtn = document.createElement('button');
  openBtn.className = 'btn btn-primary';
  openBtn.textContent = 'Open Modal';

  // Modal
  const modal = document.createElement('dialog');
  modal.className = 'modal';
  modal.id = 'demo-modal';

  // Backdrop
  if (backdropClose) {
    const backdrop = document.createElement('form');
    backdrop.method = 'dialog';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = '<button>Close</button>';
    modal.appendChild(backdrop);
  }

  // Modal box
  const modalBox = document.createElement('div');
  modalBox.className = `modal-box ${sizeClasses[size]}`;

  // Header
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-4';

  const titleEl = document.createElement('h3');
  titleEl.className = 'font-bold text-lg';
  titleEl.textContent = title;

  header.appendChild(titleEl);

  if (closable) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-sm btn-circle btn-ghost';
    closeBtn.ariaLabel = 'Close modal';
    closeBtn.innerHTML = X.render({ size: 16, class: 'stroke-current' }, { 'aria-hidden': 'true' });
    closeBtn.onclick = () => modal.close();
    header.appendChild(closeBtn);
  }

  modalBox.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.className = 'py-4';
  content.innerHTML = `
    <p class="mb-4">This is a ${size} modal with a title and some content.</p>
    <p class="text-neutral-500">You can put forms, images, or any other content here.</p>
  `;
  modalBox.appendChild(content);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'modal-action';
  actions.innerHTML = `
    <button class="btn btn-ghost" onclick="document.getElementById('demo-modal').close()">Cancel</button>
    <button class="btn btn-primary">Confirm</button>
  `;
  modalBox.appendChild(actions);

  modal.appendChild(modalBox);
  wrapper.appendChild(openBtn);
  wrapper.appendChild(modal);

  // Setup open button
  openBtn.onclick = () => modal.showModal();

  return { wrapper, openBtn };
};

export const Default: StoryObj = {
  args: { title: 'Example Modal', size: 'md' },
  render: (args) => createModal(args).wrapper,
};

export const Small: StoryObj = {
  args: { size: 'sm', title: 'Small Modal' },
  render: (args) => createModal(args).wrapper,
};

export const Large: StoryObj = {
  args: { size: 'lg', title: 'Large Modal' },
  render: (args) => createModal(args).wrapper,
};

export const XLarge: StoryObj = {
  args: { size: 'xl', title: 'Extra Large Modal' },
  render: (args) => createModal(args).wrapper,
};

export const NotClosable: StoryObj = {
  args: { closable: false, backdropClose: false },
  render: (args) => createModal(args).wrapper,
};

export const ConfirmDialog: StoryObj = {
  render: () => {
    const wrapper = document.createElement('div');

    const openBtn = document.createElement('button');
    openBtn.className = 'btn btn-error';
    openBtn.textContent = 'Delete Item';

    const modal = document.createElement('dialog');
    modal.className = 'modal';
    modal.id = 'confirm-modal';

    const backdrop = document.createElement('form');
    backdrop.method = 'dialog';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = '<button>Close</button>';
    modal.appendChild(backdrop);

    const modalBox = document.createElement('div');
    modalBox.className = 'modal-box max-w-md';

    modalBox.innerHTML = `
      <h3 class="font-bold text-lg text-error">Confirm Delete</h3>
      <div class="py-4">
        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
      </div>
      <div class="modal-action">
        <button class="btn btn-ghost">Cancel</button>
        <button class="btn btn-error">Delete</button>
      </div>
    `;

    modal.appendChild(modalBox);
    wrapper.appendChild(openBtn);
    wrapper.appendChild(modal);

    openBtn.onclick = () => modal.showModal();

    return wrapper;
  },
};

export const FormModal: StoryObj = {
  render: () => {
    const wrapper = document.createElement('div');

    const openBtn = document.createElement('button');
    openBtn.className = 'btn btn-primary';
    openBtn.textContent = 'Add Expense';

    const modal = document.createElement('dialog');
    modal.className = 'modal';
    modal.id = 'form-modal';

    const backdrop = document.createElement('form');
    backdrop.method = 'dialog';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = '<button>Close</button>';
    modal.appendChild(backdrop);

    const modalBox = document.createElement('div');
    modalBox.className = 'modal-box max-w-lg';

    modalBox.innerHTML = `
      <h3 class="font-bold text-lg">Add New Expense</h3>
      <div class="py-4 space-y-4">
        <div class="form-control">
          <label class="label"><span class="label-text">Amount</span></label>
          <input type="number" placeholder="Enter amount" class="input input-bordered" />
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">Category</span></label>
          <select class="select select-bordered">
            <option value="">Select category...</option>
            <option>Food & Dining</option>
            <option>Transportation</option>
            <option>Entertainment</option>
          </select>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">Date</span></label>
          <input type="date" class="input input-bordered" />
        </div>
      </div>
      <div class="modal-action">
        <button class="btn btn-ghost">Cancel</button>
        <button class="btn btn-primary">Save Expense</button>
      </div>
    `;

    modal.appendChild(modalBox);
    wrapper.appendChild(openBtn);
    wrapper.appendChild(modal);

    openBtn.onclick = () => modal.showModal();

    return wrapper;
  },
};
