import type { Meta, StoryObj } from '@storybook/html';
import { Menu, Plus, Bell } from '@lucide/astro';

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
    menuBtn.setAttribute('aria-label', 'Toggle menu');

    // Use Lucide Menu icon
    const menuIcon = document.createElement('div');
    menuIcon.innerHTML = Menu.render({ size: 20, class: 'stroke-current' });
    menuBtn.appendChild(menuIcon);

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
  addBtn.setAttribute('aria-label', 'Add new item');

  // Use Lucide Plus icon
  const plusIcon = document.createElement('div');
  plusIcon.innerHTML = Plus.render({ size: 16, class: 'stroke-current' });
  addBtn.appendChild(plusIcon);

  const addSpan = document.createElement('span');
  addSpan.className = 'hidden sm:inline';
  addSpan.textContent = 'Add New';
  addBtn.appendChild(addSpan);

  rightDiv.appendChild(addBtn);

  // Notifications
  const notifDiv = document.createElement('div');
  notifDiv.className = 'dropdown dropdown-end';

  const notifBtn = document.createElement('button');
  notifBtn.className = 'btn btn-square btn-ghost btn-sm relative';
  notifBtn.setAttribute('aria-label', 'Notifications');

  // Use Lucide Bell icon
  const bellIcon = document.createElement('div');
  bellIcon.innerHTML = Bell.render({ size: 20, class: 'stroke-current' });
  notifBtn.appendChild(bellIcon);

  const badge = document.createElement('span');
  badge.className = 'badge badge-xs badge-error absolute top-1 right-1';
  badge.textContent = '3';
  notifBtn.appendChild(badge);

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
