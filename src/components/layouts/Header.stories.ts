import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { Menu, Plus, Bell } = IconRenderers;

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
    'glass-effect border-b border-base-300 h-20 p-5 flex items-center justify-between gap-4';

  // Left side
  const leftDiv = document.createElement('div');
  leftDiv.className = 'flex items-center gap-3';

  if (showMenuToggle) {
    const menuBtn = document.createElement('button');
    menuBtn.className = 'btn btn-square btn-ghost btn-sm';
    menuBtn.setAttribute('aria-label', 'Toggle menu');

    // Use Lucide Menu icon
    menuBtn.appendChild(
      Menu.render({ size: 22, class: 'stroke-current' }, { 'aria-hidden': 'true' })
    );

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
  addBtn.className = 'btn btn-accent btn-sm gap-2 shadow-accent-glow';
  addBtn.setAttribute('aria-label', 'Add new item');

  // Use Lucide Plus icon
  addBtn.appendChild(Plus.render({ size: 22, class: 'stroke-current' }, { 'aria-hidden': 'true' }));

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
  notifBtn.appendChild(
    Bell.render({ size: 22, class: 'stroke-current' }, { 'aria-hidden': 'true' })
  );

  const badge = document.createElement('span');
  badge.className = 'badge badge-xs badge-error absolute top-1 right-1';
  badge.textContent = '3';
  notifBtn.appendChild(badge);

  notifDiv.appendChild(notifBtn);

  const notifMenu = document.createElement('ul');
  notifMenu.className =
    'dropdown-content z-10 menu p-2 shadow-premium bg-base-100 border border-base-300 rounded-box w-80';
  notifMenu.innerHTML = `
    <li class="menu-title"><span class="text-sm font-semibold">Notifications</span></li>
    <li>
      <a href="#" class="flex flex-col items-start gap-1 p-2">
        <span class="text-sm font-medium">Budget exceeded</span>
        <span class="text-xs text-neutral">Dining out is 120% over budget</span>
        <span class="text-xs text-neutral/70">2 hours ago</span>
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
