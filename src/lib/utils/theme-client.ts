/**
 * Theme client utilities
 *
 * Shared helpers for applying, reading, and persisting the user's theme
 * preference on the client side.
 */
import { getCsrfHeaders } from '@/lib/csrf-client';

export type Theme = 'system' | 'light' | 'dark' | 'monochrome';

const API_THEME_URL = '/api/user/theme';

/**
 * Apply a theme to the document immediately without a page reload.
 * Also stamps data-theme-preference on <html> so getCurrentTheme()
 * can read it back without decoding the combined data-theme + filter state.
 */
export function applyThemeToDom(theme: Theme): void {
  const html = document.documentElement;
  html.setAttribute('data-theme-preference', theme);

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

/**
 * Read the currently active theme from the document.
 *
 * Prefers the data-theme-preference attribute (set by applyThemeToDom on
 * client-side interactions). Falls back to decoding SSR attributes on
 * initial page load before any client-side selection has occurred.
 */
export function getCurrentTheme(): Theme {
  const html = document.documentElement;
  const preference = html.getAttribute('data-theme-preference') as Theme | null;
  if (preference) return preference;

  // Decode from SSR-injected attributes (initial load)
  if (html.style.filter.includes('grayscale')) return 'monochrome';
  if (!html.getAttribute('data-theme-server')) return 'system';
  return (html.getAttribute('data-theme') as Theme) || 'system';
}

/**
 * Persist the theme to the server via PUT /api/user/theme.
 * Throws on network error or non-OK response.
 */
export async function saveTheme(theme: Theme, signal?: AbortSignal): Promise<void> {
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
}
