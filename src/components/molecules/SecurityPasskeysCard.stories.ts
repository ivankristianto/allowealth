import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/SecurityPasskeysCard',
  tags: ['autodocs'],
};

export default meta;

const createPasskeysCard = (): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'card bg-base-100 shadow border border-base-300';

  wrapper.innerHTML = `
    <div class="card-body p-6 space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="card-title text-lg">Passkeys</h3>
          <p class="text-sm text-base-content/70">Manage trusted devices and biometric sign-ins.</p>
        </div>
        <button type="button" class="btn btn-accent btn-sm">Add Passkey</button>
      </div>
      <div class="space-y-3">
        <div class="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold">MacBook Pro Touch ID</p>
            <p class="text-xs text-base-content/60">Last used Jan 12, 2026</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm text-error">Remove</button>
        </div>
        <div class="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold">iPhone 15 Face ID</p>
            <p class="text-xs text-base-content/60">Last used Jan 02, 2026</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm text-error">Remove</button>
        </div>
      </div>
    </div>
  `;

  return wrapper;
};

export const Default: StoryObj = {
  render: () => createPasskeysCard(),
};
