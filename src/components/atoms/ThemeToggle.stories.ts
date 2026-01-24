import type { Meta, StoryObj } from '@storybook/html';

/**
 * ThemeToggle Component Stories
 *
 * The ThemeToggle component provides a button to switch between light and dark themes.
 * It displays a moon icon in light mode (to switch to dark) and a sun icon in dark mode
 * (to switch to light).
 *
 * Features:
 * - Persists theme preference to localStorage
 * - Respects system color scheme preference
 * - Accessible with proper ARIA labels
 * - Hover/focus states with scale and ring effects
 */

const meta: Meta = {
  title: 'Atoms/ThemeToggle',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A floating button that toggles between light and dark themes. Shows moon icon in light mode, sun icon in dark mode.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

// Moon SVG icon (shown in light mode)
const moonIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-base-content transition-transform duration-200 group-hover:rotate-12" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </svg>
`;

// Sun SVG icon (shown in dark mode)
const sunIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-base-content transition-transform duration-200 group-hover:rotate-12" aria-hidden="true">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2"/>
    <path d="M12 20v2"/>
    <path d="m4.93 4.93 1.41 1.41"/>
    <path d="m17.66 17.66 1.41 1.41"/>
    <path d="M2 12h2"/>
    <path d="M20 12h2"/>
    <path d="m6.34 17.66-1.41 1.41"/>
    <path d="m19.07 4.93-1.41 1.41"/>
  </svg>
`;

const baseButtonClasses =
  'w-14 h-14 bg-base-100 border border-base-300 shadow-xl rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 group';

/**
 * Default state showing the moon icon (light mode - click to switch to dark)
 */
export const Default: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'theme-toggle-wrapper';
    container.innerHTML = `
      <button
        type="button"
        class="${baseButtonClasses}"
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
      >
        ${moonIcon}
      </button>
    `;
    return container;
  },
};

/**
 * Light mode state - shows moon icon to indicate clicking will switch to dark mode
 */
export const LightMode: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'p-8 bg-white rounded-xl';
    container.innerHTML = `
      <div class="flex flex-col items-center gap-4">
        <span class="text-sm text-base-content/60">Light mode active</span>
        <div class="theme-toggle-wrapper">
          <button
            type="button"
            class="${baseButtonClasses}"
            aria-label="Switch to dark mode"
            title="Switch to dark mode"
          >
            ${moonIcon}
          </button>
        </div>
        <span class="text-xs text-base-content/40">Click to switch to dark</span>
      </div>
    `;
    return container;
  },
};

/**
 * Dark mode state - shows sun icon to indicate clicking will switch to light mode
 */
export const DarkMode: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'p-8 bg-slate-900 rounded-xl';
    container.innerHTML = `
      <div class="flex flex-col items-center gap-4">
        <span class="text-sm text-slate-400">Dark mode active</span>
        <div class="theme-toggle-wrapper">
          <button
            type="button"
            class="w-14 h-14 bg-slate-800 border border-slate-700 shadow-xl rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 group"
            aria-label="Switch to light mode"
            title="Switch to light mode"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-slate-200 transition-transform duration-200 group-hover:rotate-12" aria-hidden="true">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2"/>
              <path d="M12 20v2"/>
              <path d="m4.93 4.93 1.41 1.41"/>
              <path d="m17.66 17.66 1.41 1.41"/>
              <path d="M2 12h2"/>
              <path d="M20 12h2"/>
              <path d="m6.34 17.66-1.41 1.41"/>
              <path d="m19.07 4.93-1.41 1.41"/>
            </svg>
          </button>
        </div>
        <span class="text-xs text-slate-500">Click to switch to light</span>
      </div>
    `;
    return container;
  },
};

/**
 * Interactive demo with theme switching
 */
export const Interactive: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center gap-6 p-8';
    container.innerHTML = `
      <p class="text-sm text-base-content/60">Click to toggle theme</p>
      <div class="theme-toggle-wrapper">
        <button
          type="button"
          id="story-theme-toggle"
          class="${baseButtonClasses}"
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          <span class="theme-icon-light">${moonIcon}</span>
          <span class="theme-icon-dark hidden">${sunIcon}</span>
        </button>
      </div>
      <p id="theme-status" class="text-xs text-base-content/40">Current: Light mode</p>
    `;

    // Add interactive behavior
    setTimeout(() => {
      const button = container.querySelector('#story-theme-toggle');
      const lightIcon = container.querySelector('.theme-icon-light');
      const darkIcon = container.querySelector('.theme-icon-dark');
      const status = container.querySelector('#theme-status');

      if (button && lightIcon && darkIcon && status) {
        let isDark = false;
        button.addEventListener('click', () => {
          isDark = !isDark;
          if (isDark) {
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
            status.textContent = 'Current: Dark mode';
            button.setAttribute('aria-label', 'Switch to light mode');
          } else {
            lightIcon.classList.remove('hidden');
            darkIcon.classList.add('hidden');
            status.textContent = 'Current: Light mode';
            button.setAttribute('aria-label', 'Switch to dark mode');
          }
        });
      }
    }, 0);

    return container;
  },
};

/**
 * Accessibility demo showing focus state
 */
export const FocusState: Story = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'p-8';
    container.innerHTML = `
      <div class="flex flex-col items-center gap-4">
        <span class="text-sm text-base-content/60">Focus visible state (keyboard navigation)</span>
        <div class="theme-toggle-wrapper">
          <button
            type="button"
            class="w-14 h-14 bg-base-100 border border-base-300 shadow-xl rounded-2xl flex items-center justify-center transition-all duration-200 outline-none ring-2 ring-accent ring-offset-2 group"
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            ${moonIcon}
          </button>
        </div>
        <span class="text-xs text-base-content/40">Tab to focus, Enter/Space to toggle</span>
      </div>
    `;
    return container;
  },
};
