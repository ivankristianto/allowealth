import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Organisms/ManageAccountForms',
  tags: ['autodocs'],
};

export default meta;

const createManageAccountForms = (): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-8';

  wrapper.innerHTML = `
    <section class="card bg-base-100 shadow border border-base-300">
      <div class="card-body p-6 space-y-6">
        <div class="flex items-center gap-4">
          <div class="rounded-2xl bg-accent/10 text-accent p-3">
            <span class="text-xl font-semibold">P</span>
          </div>
          <div>
            <h3 class="text-lg font-bold">Public Profile</h3>
            <p class="text-xs uppercase tracking-widest text-base-content/50">General Information</p>
          </div>
        </div>

        <form class="space-y-6">
          <div class="flex flex-col gap-6 lg:flex-row">
            <div class="flex flex-col items-center gap-3 lg:w-40">
              <div class="avatar placeholder">
                <div class="bg-base-200 text-primary rounded-2xl w-20 h-20 text-2xl font-semibold">S</div>
              </div>
              <button type="button" class="link link-accent text-xs font-semibold">Change Photo</button>
            </div>

            <div class="flex-1 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="form-control">
                <label class="label py-1">
                  <span class="text-xs uppercase tracking-widest text-base-content/50 font-medium">Full Name</span>
                </label>
                <input type="text" class="input input-bordered w-full h-10 bg-base-200 text-xs" value="Sarah Jenkins" />
              </div>
              <div class="form-control">
                <label class="label py-1">
                  <span class="text-xs uppercase tracking-widest text-base-content/50 font-medium">Email Address</span>
                </label>
                <input type="email" class="input input-bordered w-full h-10 bg-base-200 text-xs" value="sarah.j@familyfinance.com" />
              </div>
              <div class="form-control">
                <label class="label py-1">
                  <span class="text-xs uppercase tracking-widest text-base-content/50 font-medium">Phone Number</span>
                </label>
                <input type="text" class="input input-bordered w-full h-10 bg-base-200 text-xs" value="+62 812-3456-7890" />
              </div>
              <div class="form-control">
                <label class="label py-1">
                  <span class="text-xs uppercase tracking-widest text-base-content/50 font-medium">Default Currency</span>
                </label>
                <select class="select select-bordered w-full h-10 pt-2 pb-2 pl-3 pr-10 text-xs bg-base-200">
                  <option>Indonesian Rupiah (IDR)</option>
                  <option>US Dollar (USD)</option>
                </select>
              </div>
              <div class="form-control md:col-span-2">
                <label class="label py-1">
                  <span class="text-xs uppercase tracking-widest text-base-content/50 font-medium">Short Bio</span>
                </label>
                <textarea class="textarea textarea-bordered w-full bg-base-200 text-xs pt-2 pb-2 px-3" rows="3">Family CFO and tech enthusiast.</textarea>
              </div>
            </div>
          </div>
          <div class="flex justify-end">
            <button type="button" class="btn btn-accent h-10 px-5 py-2.5 text-sm">Save Profile Changes</button>
          </div>
        </form>
      </div>
    </section>

    <section class="card bg-base-100 shadow border border-base-300">
      <div class="card-body p-6 space-y-6">
        <div>
          <h3 class="text-lg font-bold">Change Password</h3>
          <p class="text-sm text-base-content/70">Update your password. You'll need to enter your current password to make changes.</p>
        </div>
        <form class="space-y-5">
          <div class="form-control">
            <label class="label py-1">
              <span class="text-xs uppercase tracking-widest text-base-content/50 font-medium">Current Password</span>
            </label>
            <input type="password" class="input input-bordered w-full h-10 bg-base-200 text-xs" />
          </div>
          <div class="form-control">
            <label class="label py-1">
              <span class="text-xs uppercase tracking-widest text-base-content/50 font-medium">New Password</span>
            </label>
            <input type="password" class="input input-bordered w-full h-10 bg-base-200 text-xs" />
          </div>
          <div class="form-control">
            <label class="label py-1">
              <span class="text-xs uppercase tracking-widest text-base-content/50 font-medium">Confirm New Password</span>
            </label>
            <input type="password" class="input input-bordered w-full h-10 bg-base-200 text-xs" />
          </div>
          <div class="flex justify-end">
            <button type="button" class="btn btn-accent h-10 px-5 py-2.5 text-sm">Change Password</button>
          </div>
        </form>
      </div>
    </section>

    <section class="card bg-error/5 border border-error/20 shadow">
      <div class="card-body p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-bold text-error">Danger Zone</h3>
          <p class="text-sm text-base-content/70">Permanently delete your account and all associated data.</p>
        </div>
        <button type="button" class="btn btn-error btn-sm">Delete Account</button>
      </div>
    </section>
  `;

  return wrapper;
};

export const Default: StoryObj = {
  render: () => createManageAccountForms(),
};
