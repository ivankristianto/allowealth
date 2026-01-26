import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Organisms/ManageAccountForms',
  tags: ['autodocs'],
};

export default meta;

const createManageAccountForms = (): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-6';

  wrapper.innerHTML = `
    <section class="card bg-base-100 shadow border border-base-300">
      <div class="card-body p-6">
        <h3 class="card-title text-lg">Profile Information</h3>
        <p class="text-sm text-base-content/70 mb-6">Update your personal information and contact details.</p>
        <form class="space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="form-control">
              <label class="label"><span class="label-text">Display Name</span></label>
              <input type="text" class="input input-bordered w-full h-10 bg-base-200 text-xs" value="Sarah Jenkins" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Email</span></label>
              <input type="email" class="input input-bordered w-full h-10 bg-base-200 text-xs" value="sarah.j@familyfinance.com" />
            </div>
          </div>
          <button type="button" class="btn btn-accent h-10 px-5 py-2.5 text-sm">Save Changes</button>
        </form>
      </div>
    </section>

    <section class="card bg-base-100 shadow border border-base-300">
      <div class="card-body p-6">
        <h3 class="card-title text-lg">Personal Details</h3>
        <p class="text-sm text-base-content/70 mb-6">Keep your contact details up to date for account recovery.</p>
        <form class="space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="form-control">
              <label class="label"><span class="label-text">Phone Number</span></label>
              <input type="text" class="input input-bordered w-full h-10 bg-base-200 text-xs" value="+62 812-3456-7890" />
            </div>
            <div class="form-control md:col-span-2">
              <label class="label"><span class="label-text">Short Bio</span></label>
              <textarea class="textarea textarea-bordered w-full bg-base-200 text-xs pt-2 pb-2 px-3 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none" rows="3">Family CFO and tech enthusiast.</textarea>
            </div>
          </div>
          <button type="button" class="btn btn-secondary h-10 px-5 py-2.5 text-sm" disabled>Save Details</button>
        </form>
      </div>
    </section>

    <section class="card bg-base-100 shadow border border-base-300">
      <div class="card-body p-6">
        <h3 class="card-title text-lg">Currency Preferences</h3>
        <p class="text-sm text-base-content/70 mb-6">Set your default currency for displaying financial data.</p>
        <form class="space-y-5">
          <div class="form-control">
            <label class="label"><span class="label-text">Default Currency</span></label>
            <select class="select select-bordered w-full h-10 pt-2 pb-2 pl-3 pr-10 text-xs bg-base-200 focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none focus:ring-offset-2">
              <option>Indonesian Rupiah (IDR)</option>
              <option>United States Dollar (USD)</option>
            </select>
          </div>
          <button type="button" class="btn btn-accent h-10 px-5 py-2.5 text-sm">Save Changes</button>
        </form>
      </div>
    </section>

    <section class="card bg-base-100 shadow border border-base-300">
      <div class="card-body p-6">
        <h3 class="card-title text-lg">Change Password</h3>
        <p class="text-sm text-base-content/70 mb-6">Update your password for better security.</p>
        <form class="space-y-5">
          <div class="form-control">
            <label class="label"><span class="label-text">Current Password</span></label>
            <input type="password" class="input input-bordered w-full h-10 bg-base-200 text-xs" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">New Password</span></label>
            <input type="password" class="input input-bordered w-full h-10 bg-base-200 text-xs" />
          </div>
          <button type="button" class="btn btn-accent h-10 px-5 py-2.5 text-sm">Change Password</button>
        </form>
      </div>
    </section>
  `;

  return wrapper;
};

export const Default: StoryObj = {
  render: () => createManageAccountForms(),
};
