import { addToast } from '@/lib/stores/toastStore';
import { getCsrfHeaders } from '@/lib/csrf-client';

const API_THEME_URL = '/api/user/theme';
const FORM_ID = 'appearances-form';
const CONTROLLER_KEY = '__appearancesFormController';

type Theme = 'system' | 'light' | 'dark' | 'monochrome';

declare global {
  interface Window {
    __appearancesFormController?: AbortController;
  }
}

export function applyThemeToDom(theme: Theme): void {
  const html = document.documentElement;

  if (theme === 'monochrome') {
    html.setAttribute('data-theme', 'light');
    html.setAttribute('data-theme-server', 'true');
    html.style.filter = 'grayscale(100%)';
    return;
  }

  if (theme === 'system') {
    html.removeAttribute('data-theme-server');
    html.style.filter = '';

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    return;
  }

  html.setAttribute('data-theme', theme);
  html.setAttribute('data-theme-server', 'true');
  html.style.filter = '';
}

export function initAppearancesForm(): void {
  window[CONTROLLER_KEY]?.abort();

  const controller = new AbortController();
  window[CONTROLLER_KEY] = controller;
  const { signal } = controller;

  const form = document.getElementById(FORM_ID);
  if (!(form instanceof HTMLElement)) return;

  const radios = form.querySelectorAll<HTMLInputElement>('input[type="radio"][name="theme"]');

  radios.forEach((radio) => {
    radio.addEventListener(
      'change',
      async () => {
        if (!radio.checked) return;

        const theme = radio.value as Theme;
        const previousTheme = (form.dataset.currentTheme as Theme | undefined) ?? 'system';

        applyThemeToDom(theme);
        form.dataset.currentTheme = theme;

        try {
          const response = await fetch(API_THEME_URL, {
            method: 'PUT',
            headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({ theme }),
            signal,
          });
          const result = (await response.json()) as { success?: boolean };

          if (!response.ok || !result.success) {
            throw new Error('Failed to save theme preference');
          }

          addToast('Theme updated', 'success');
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;

          applyThemeToDom(previousTheme);
          form.dataset.currentTheme = previousTheme;
          radios.forEach((candidate) => {
            candidate.checked = candidate.value === previousTheme;
          });
          addToast('Failed to save theme preference', 'error');
        }
      },
      { signal }
    );
  });
}

initAppearancesForm();
document.addEventListener('astro:page-load', initAppearancesForm);
