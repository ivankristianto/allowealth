import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Layouts/Header',
  tags: ['autodocs'],
  argTypes: {
    currentPath: {
      control: 'select',
      options: ['/', '/dashboard', '/transactions', '/budget', '/assets', '/reports'],
    },
    showMenuToggle: { control: 'boolean' },
  },
};

export default meta;

const createHeader = (args: { currentPath?: string; showMenuToggle?: boolean }): HTMLElement => {
  const { currentPath = '/', showMenuToggle = true } = args;

  const getPageTitle = (path: string) => {
    const titles: Record<string, string> = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/transactions': 'Transactions',
      '/budget': 'Budget',
      '/assets': 'Assets',
      '/reports': 'Reports',
    };
    return titles[path] || 'Finance Manager';
  };

  const header = document.createElement('header');
  header.className =
    'bg-base-100 border-b border-base-300 px-4 py-3 flex items-center justify-between gap-4';

  // Left side
  const leftDiv = document.createElement('div');
  leftDiv.className = 'flex items-center gap-3';

  if (showMenuToggle) {
    const menuBtn = document.createElement('button');
    menuBtn.className = 'btn btn-square btn-ghost';
    menuBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    `;
    menuBtn.setAttribute('aria-label', 'Toggle menu');
    leftDiv.appendChild(menuBtn);
  }

  const title = document.createElement('h1');
  title.className = 'text-xl font-semibold';
  title.textContent = getPageTitle(currentPath);
  leftDiv.appendChild(title);

  header.appendChild(leftDiv);

  // Right side
  const rightDiv = document.createElement('div');
  rightDiv.className = 'flex items-center gap-2';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary btn-sm gap-2';
  addBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
    <span class="hidden sm:inline">Add New</span>
  `;
  rightDiv.appendChild(addBtn);

  // Notifications
  const notifDiv = document.createElement('div');
  notifDiv.className = 'dropdown dropdown-end';

  const notifBtn = document.createElement('button');
  notifBtn.className = 'btn btn-square btn-ghost btn-sm relative';
  notifBtn.setAttribute('aria-label', 'Notifications');
  notifBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    <span class="badge badge-xs badge-error absolute top-1 right-1">3</span>
  `;
  notifDiv.appendChild(notifBtn);

  const notifMenu = document.createElement('ul');
  notifMenu.className = 'dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-80';
  notifMenu.innerHTML = `
    <li class="menu-title"><span class="text-sm font-semibold">Notifications</span></li>
    <li>
      <a href="#" class="flex flex-col items-start gap-1 p-2">
        <span class="text-sm font-medium">Budget exceeded</span>
        <span class="text-xs text-neutral-500">Dining out is 120% over budget</span>
        <span class="text-xs text-neutral-400">2 hours ago</span>
      </a>
    </li>
  `;
  notifDiv.appendChild(notifMenu);
  rightDiv.appendChild(notifDiv);

  header.appendChild(rightDiv);

  return header;
};

export const Default: StoryObj = {
  args: { currentPath: '/dashboard' },
  render: (args) => createHeader(args),
};

export const Transactions: StoryObj = {
  args: { currentPath: '/transactions' },
  render: (args) => createHeader(args),
};

export const Budget: StoryObj = {
  args: { currentPath: '/budget' },
  render: (args) => createHeader(args),
};

export const NoMenuToggle: StoryObj = {
  args: { showMenuToggle: false },
  render: (args) => createHeader(args),
};
