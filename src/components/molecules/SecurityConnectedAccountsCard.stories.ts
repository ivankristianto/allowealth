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
      <div class="flex items-center gap-4">
        <div class="rounded-2xl bg-accent/10 text-accent p-3">
          <span class="text-xl font-semibold">S</span>
        </div>
        <div>
          <h3 class="text-lg font-bold">Connected Accounts</h3>
          <p class="text-xs uppercase tracking-widest text-base-content/50">Single Sign-On (SSO)</p>
        </div>
      </div>
      <div class="space-y-4">
        <div class="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-200/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-4">
            <div class="rounded-xl bg-base-100 p-3 text-base-content/60">
              <span class="text-sm font-semibold">G</span>
            </div>
            <div>
              <p class="text-sm font-semibold">Google SSO</p>
              <p class="text-xs text-base-content/60">Sign in using your Google account</p>
            </div>
          </div>
          <button type="button" class="btn btn-accent btn-sm">Connect Account</button>
        </div>
      </div>
    </div>
  `;

  return wrapper;
};

export const Default: StoryObj = {
  render: () => createConnectedAccountsCard(),
};
