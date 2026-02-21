/**
 * Currency Switcher Client Script
 *
 * Handles currency switching via cookie persistence.
 * Uses document-level event delegation so it survives Astro page transitions.
 */

const COOKIE_NAME = 'activeCurrency';
const COOKIE_MAX_AGE = 31536000; // 1 year in seconds
const INIT_KEY = '__currencySwitcherInit';

interface SwitcherWindow extends Window {
  [INIT_KEY]?: boolean;
}

function setActiveCurrencyCookie(currency: string): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${currency}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function handleCurrencySwitch(event: Event): void {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLElement>('[data-currency-switcher] [data-currency-value]');
  if (!button) return;

  const currency = button.dataset.currencyValue;
  if (!currency) return;

  // Don't reload if already active
  if (button.getAttribute('aria-checked') === 'true') return;

  setActiveCurrencyCookie(currency);

  // Remove ?currency= from URL if present, then reload
  const url = new URL(window.location.href);
  url.searchParams.delete('currency');
  window.location.href = url.toString();
}

function initCurrencySwitcher(): void {
  const w = window as SwitcherWindow;
  if (w[INIT_KEY]) return;

  // Delegate at document level so it survives DOM swaps during page transitions
  document.addEventListener('click', handleCurrencySwitch);
  w[INIT_KEY] = true;
}

initCurrencySwitcher();
