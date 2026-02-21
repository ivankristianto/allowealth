type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';
const THEME_ATTRIBUTE = 'data-theme';
const TOGGLE_SELECTOR = '[data-theme-toggle]';
const INIT_ATTRIBUTE = 'data-theme-toggle-init';
let controller: AbortController | null = null;

function initThemeToggle() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const toggles = document.querySelectorAll(TOGGLE_SELECTOR);
  if (toggles.length === 0) return;

  function getCurrentTheme(): Theme {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  function updateAllToggles(theme: Theme) {
    toggles.forEach((toggle) => {
      toggle.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    });
  }

  function setTheme(theme: Theme) {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    updateAllToggles(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute(THEME_ATTRIBUTE);
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  const existingTheme = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  if (existingTheme === 'light' || existingTheme === 'dark') {
    updateAllToggles(existingTheme);
  } else {
    setTheme(getCurrentTheme());
  }

  toggles.forEach((toggle) => {
    if (toggle.getAttribute(INIT_ATTRIBUTE) === 'true') return;
    toggle.setAttribute(INIT_ATTRIBUTE, 'true');
    toggle.addEventListener('click', toggleTheme);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener(
    'change',
    (event) => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        setTheme(event.matches ? 'dark' : 'light');
      }
    },
    { signal }
  );
}

initThemeToggle();
document.addEventListener('astro:page-load', initThemeToggle);
