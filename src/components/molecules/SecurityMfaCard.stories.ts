import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/SecurityMfaCard',
  tags: ['autodocs'],
};

export default meta;

const createMfaCard = (): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'card bg-base-100 shadow border border-base-300';

  wrapper.innerHTML = `
    <div class="card-body p-6 space-y-6">
      <div class="flex items-center gap-4">
        <div class="rounded-2xl bg-success/10 text-success p-3">
          <span class="text-xl font-semibold">2</span>
        </div>
        <div>
          <h3 class="text-lg font-bold">Multi-Factor Authentication</h3>
          <p class="text-xs uppercase tracking-widest text-base-content/50">2FA Protection</p>
        </div>
      </div>
      <div class="flex items-center justify-between gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4">
        <div class="flex items-center gap-4">
          <div class="rounded-xl bg-success text-success-content p-2">
            <span class="text-xs font-semibold">App</span>
          </div>
          <div>
            <p class="text-sm font-semibold">Authenticator App</p>
            <p class="text-xs text-base-content/60">Use apps like Google Authenticator or Authy</p>
          </div>
        </div>
        <input type="checkbox" class="toggle toggle-accent" />
      </div>
    </div>
  `;

  return wrapper;
};

export const Default: StoryObj = {
  render: () => createMfaCard(),
};
