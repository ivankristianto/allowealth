import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/SecurityConnectedAccountsCard',
  tags: ['autodocs'],
};

export default meta;

const createConnectedAccountsCard = (): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'card bg-base-100 shadow border border-base-300';

  wrapper.innerHTML = `
    <div class="card-body p-6 space-y-6">
      <div>
        <h3 class="card-title text-lg">Connected Accounts</h3>
        <p class="text-sm text-base-content/70">Link trusted providers to sign in faster and recover access.</p>
      </div>
      <div class="space-y-4">
        <div class="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold">Google</p>
            <p class="text-xs text-base-content/60">Connected as sarah.j@familyfinance.com</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="badge badge-success badge-sm">Connected</span>
            <button type="button" class="btn btn-outline btn-sm">Disconnect</button>
          </div>
        </div>
        <div class="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold">Apple</p>
            <p class="text-xs text-base-content/60">Not connected</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="badge badge-neutral badge-sm">Not linked</span>
            <button type="button" class="btn btn-accent btn-sm">Connect</button>
          </div>
        </div>
      </div>
    </div>
  `;

  return wrapper;
};

export const Default: StoryObj = {
  render: () => createConnectedAccountsCard(),
};
