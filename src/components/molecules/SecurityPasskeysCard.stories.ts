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
        <div class="flex items-center gap-4">
          <div class="rounded-2xl bg-warning/10 text-warning p-3">
            <span class="text-xl font-semibold">F</span>
          </div>
          <div>
            <h3 class="text-lg font-bold">Passkeys</h3>
            <p class="text-xs uppercase tracking-widest text-base-content/50">Biometric &amp; Hardware Keys</p>
          </div>
        </div>
        <button type="button" class="btn btn-accent btn-sm">Add Passkey</button>
      </div>
      <p class="text-sm text-base-content/70">Sign in faster and more securely with your biometric data or hardware security keys.</p>
      <div class="border border-base-300 rounded-2xl overflow-hidden divide-y divide-base-300 bg-base-100">
        <div class="flex items-center justify-between gap-4 p-4">
          <div>
            <p class="text-sm font-semibold">MacBook Pro Touch ID</p>
            <p class="text-xs text-base-content/60">Added on Jan 15, 2024</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm text-error">Remove</button>
        </div>
        <div class="flex items-center justify-between gap-4 p-4">
          <div>
            <p class="text-sm font-semibold">iPhone 15 Face ID</p>
            <p class="text-xs text-base-content/60">Added on Jan 12, 2024</p>
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
