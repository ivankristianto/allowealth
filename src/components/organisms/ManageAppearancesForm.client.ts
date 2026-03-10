import { addToast } from '@/lib/stores/toastStore';
import {
  THEME_CHANGE_EVENT,
  type Theme,
  applyThemeToDom,
  saveTheme,
} from '@/lib/utils/theme-client';

const FORM_ID = 'appearances-form';
const CONTROLLER_KEY = '__appearancesFormController';

let saveController: AbortController | null = null;
let saveRequestVersion = 0;

declare global {
  interface Window {
    __appearancesFormController?: AbortController;
  }
}

export function initAppearancesForm(): void {
  window[CONTROLLER_KEY]?.abort();
  saveController?.abort();

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
        saveController?.abort();
        saveController = new AbortController();
        const requestVersion = ++saveRequestVersion;

        applyThemeToDom(theme);
        form.dataset.currentTheme = theme;
        document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));

        try {
          await saveTheme(theme, saveController.signal);
          if (requestVersion !== saveRequestVersion) return;
          addToast('Theme updated', 'success');
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
          if (requestVersion !== saveRequestVersion) return;

          applyThemeToDom(previousTheme);
          form.dataset.currentTheme = previousTheme;
          document.dispatchEvent(
            new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: previousTheme } })
          );
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
