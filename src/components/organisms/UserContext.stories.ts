/**
 * UserContext Storybook Stories
 *
 * Stories for the UserContext organism component.
 */

import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Organisms/UserContext',
  tags: ['autodocs'],
};

export default meta;

type User = {
  id: string;
  email: string;
  name: string;
  attributes: {
    id: string;
    email: string;
    name: string;
  };
};

type UserContextArgs = {
  user?: User | null;
};

// Mock user data
const mockUser: User = {
  id: '123',
  email: 'user@example.com',
  name: 'John Doe',
  attributes: {
    id: '123',
    email: 'user@example.com',
    name: 'John Doe',
  },
};

const createUserContext = (args: UserContextArgs): HTMLElement => {
  const { user = null } = args;

  const container = document.createElement('div');

  if (user) {
    // Logged in: Show user name and logout
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown dropdown-end';
    dropdown.setAttribute('data-user-context', '');

    // Toggle button
    const button = document.createElement('button');
    button.className = 'btn btn-ghost btn-sm gap-2';
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', 'User menu');

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'avatar placeholder';
    const avatarInner = document.createElement('div');
    avatarInner.className = 'bg-primary text-primary-content rounded-full w-8';
    const avatarText = document.createElement('span');
    avatarText.className = 'text-xs';
    avatarText.textContent = user.name.charAt(0).toUpperCase();
    avatarInner.appendChild(avatarText);
    avatar.appendChild(avatarInner);
    button.appendChild(avatar);

    // User name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'hidden sm:inline text-sm font-medium';
    nameSpan.textContent = user.name;
    button.appendChild(nameSpan);

    // Dropdown arrow
    const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrowSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    arrowSvg.setAttribute('class', 'h-4 w-4');
    arrowSvg.setAttribute('fill', 'none');
    arrowSvg.setAttribute('viewBox', '0 0 24 24');
    arrowSvg.setAttribute('stroke', 'currentColor');
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('stroke-linecap', 'round');
    arrowPath.setAttribute('stroke-linejoin', 'round');
    arrowPath.setAttribute('stroke-width', '2');
    arrowPath.setAttribute('d', 'M19 9l-7 7-7-7');
    arrowSvg.appendChild(arrowPath);
    button.appendChild(arrowSvg);

    dropdown.appendChild(button);

    // Dropdown menu
    const menu = document.createElement('ul');
    menu.className = 'dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52';
    menu.setAttribute('tabindex', '0');

    // Menu title
    const titleLi = document.createElement('li');
    titleLi.className = 'menu-title';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'text-sm font-semibold';
    titleSpan.textContent = 'My Account';
    titleLi.appendChild(titleSpan);
    menu.appendChild(titleLi);

    // Profile link
    const profileLi = document.createElement('li');
    const profileLink = document.createElement('a');
    profileLink.href = '/settings';
    profileLink.className = 'flex items-center gap-2';
    profileLink.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span>Profile Settings</span>
    `;
    profileLi.appendChild(profileLink);
    menu.appendChild(profileLi);

    // Logout button
    const logoutLi = document.createElement('li');
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'flex items-center gap-2 text-error';
    logoutBtn.setAttribute('type', 'button');
    logoutBtn.setAttribute('data-logout-button', '');
    logoutBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span>Sign Out</span>
    `;
    logoutLi.appendChild(logoutBtn);
    menu.appendChild(logoutLi);

    dropdown.appendChild(menu);
    container.appendChild(dropdown);
  } else {
    // Logged out: Show login/register links
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2';

    const loginLink = document.createElement('a');
    loginLink.href = '/login';
    loginLink.className = 'btn btn-ghost btn-sm';
    loginLink.textContent = 'Sign In';
    div.appendChild(loginLink);

    const signupLink = document.createElement('a');
    signupLink.href = '/register';
    signupLink.className = 'btn btn-primary btn-sm';
    signupLink.textContent = 'Sign Up';
    div.appendChild(signupLink);

    container.appendChild(div);
  }

  return container;
};

export const LoggedIn: StoryObj<UserContextArgs> = {
  args: { user: mockUser },
  render: (args) => createUserContext(args),
  parameters: {
    docs: {
      description: {
        story:
          'UserContext component displaying user menu when user is logged in. Shows avatar, user name, and dropdown with profile settings and logout options.',
      },
    },
  },
};

export const LoggedOut: StoryObj<UserContextArgs> = {
  args: { user: null },
  render: (args) => createUserContext(args),
  parameters: {
    docs: {
      description: {
        story:
          'UserContext component displaying login and signup buttons when user is not authenticated.',
      },
    },
  },
};

export const WithLongName: StoryObj<UserContextArgs> = {
  args: {
    user: {
      ...mockUser,
      name: 'A Very Long User Name That Might Be Truncated',
      attributes: {
        ...mockUser.attributes,
        name: 'A Very Long User Name That Might Be Truncated',
      },
    },
  },
  render: (args) => createUserContext(args),
  parameters: {
    docs: {
      description: {
        story:
          'UserContext component with a user that has a very long name. Tests how the component handles long text.',
      },
    },
  },
};
