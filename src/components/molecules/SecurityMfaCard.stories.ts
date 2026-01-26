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
      <div>
        <h3 class="card-title text-lg">Multi-Factor Authentication</h3>
        <p class="text-sm text-base-content/70">Add a second verification step to protect your account.</p>
      </div>
      <label class="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold">Authenticator App</span>
            <span class="badge badge-accent badge-sm">Recommended</span>
          </div>
          <p class="text-xs text-base-content/60 mt-1">Use an authenticator app like Google Authenticator or Authy.</p>
        </div>
        <input type="checkbox" class="toggle toggle-accent" checked />
      </label>
      <label class="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span class="text-sm font-semibold">SMS Codes</span>
          <p class="text-xs text-base-content/60 mt-1">Receive verification codes via SMS.</p>
        </div>
        <input type="checkbox" class="toggle toggle-accent" />
      </label>
    </div>
  `;

  return wrapper;
};

export const Default: StoryObj = {
  render: () => createMfaCard(),
};
