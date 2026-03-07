import { getCsrfHeaders } from '@/lib/csrf-client';
import { isValidCurrency, type Currency } from '@/lib/constants/currency';
import {
  attachAmountFormatter,
  stripAmountFormatting,
  type AmountFormatterHandle,
} from '@/lib/formatting/amount-input';

const DEBOUNCE_MS = 500;

let controller: AbortController | null = null;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const requestControllers = new Map<string, AbortController>();
const formatterHandles = new Map<string, AmountFormatterHandle>();

function getAssumptionsId(container: HTMLElement): string {
  return container.dataset.forecastAssumptionsId || 'forecast-assumptions';
}

function setStatus(container: HTMLElement, state: 'idle' | 'saving' | 'saved' | 'error'): void {
  const statusEl = container.querySelector<HTMLElement>('[data-forecast-assumptions-status]');
  if (!statusEl) return;

  const labelKey =
    state === 'saving'
      ? 'savingLabel'
      : state === 'saved'
        ? 'savedLabel'
        : state === 'error'
          ? 'errorLabel'
          : 'idleLabel';

  statusEl.textContent = statusEl.dataset[labelKey] || '';
  statusEl.classList.toggle('text-accent', state === 'saving');
  statusEl.classList.toggle('text-success', state === 'saved');
  statusEl.classList.toggle('text-error', state === 'error');
  statusEl.classList.toggle('text-base-content/60', state === 'idle');
}

function setInlineError(container: HTMLElement, message?: string): void {
  const errorEl = container.querySelector<HTMLElement>('[data-forecast-assumptions-error]');
  if (!errorEl) return;

  if (message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

function validateAssumptions(monthlyTopup: number, annualRate: number): string | null {
  if (!Number.isFinite(monthlyTopup) || monthlyTopup < 0) {
    return 'Monthly Top-Up must be 0 or more.';
  }

  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100) {
    return 'Expected APY must be between 0 and 100.';
  }

  return null;
}

async function saveForecastAssumptions(container: HTMLElement, currency: Currency): Promise<void> {
  const topupInput = container.querySelector<HTMLInputElement>(
    'input[name="forecastMonthlyTopup"]'
  );
  const apyInput = container.querySelector<HTMLInputElement>('input[name="forecastAnnualRate"]');
  if (!topupInput || !apyInput) return;

  const monthlyTopupValue = stripAmountFormatting(topupInput.value, currency);
  const annualRateValue = apyInput.value.trim();
  const monthlyTopup = monthlyTopupValue === '' ? 0 : Number(monthlyTopupValue);
  const annualRate = annualRateValue === '' ? 0 : Number(annualRateValue);
  const validationError = validateAssumptions(monthlyTopup, annualRate);
  if (validationError) {
    setStatus(container, 'error');
    setInlineError(container, validationError);
    return;
  }

  const assumptionsId = getAssumptionsId(container);
  requestControllers.get(assumptionsId)?.abort();

  const requestController = new AbortController();
  requestControllers.set(assumptionsId, requestController);

  setInlineError(container);
  setStatus(container, 'saving');

  try {
    const response = await fetch('/api/workspace/settings', {
      method: 'PUT',
      headers: getCsrfHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify({
        forecastMonthlyTopup: monthlyTopup,
        forecastAnnualRate: annualRate,
      }),
      signal: requestController.signal,
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Failed to save forecast assumptions.');
    }

    setInlineError(container);
    setStatus(container, 'saved');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }

    console.error('Forecast assumptions update error:', error);
    setStatus(container, 'error');
    setInlineError(
      container,
      error instanceof Error ? error.message : 'Failed to save forecast assumptions.'
    );
  } finally {
    if (requestControllers.get(assumptionsId) === requestController) {
      requestControllers.delete(assumptionsId);
    }
  }
}

function initForecastAssumptions(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const containers = document.querySelectorAll<HTMLElement>('[data-forecast-assumptions]');
  containers.forEach((container) => {
    const topupInput = container.querySelector<HTMLInputElement>(
      'input[name="forecastMonthlyTopup"]'
    );
    const apyInput = container.querySelector<HTMLInputElement>('input[name="forecastAnnualRate"]');
    if (!topupInput || !apyInput) return;

    const assumptionsId = getAssumptionsId(container);
    const currencyAttr = container.dataset.currency;
    const currency: Currency = currencyAttr && isValidCurrency(currencyAttr) ? currencyAttr : 'IDR';

    formatterHandles.get(assumptionsId)?.cleanup();
    formatterHandles.set(assumptionsId, attachAmountFormatter(topupInput, currency));

    const scheduleSave = () => {
      const existingTimer = debounceTimers.get(assumptionsId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        void saveForecastAssumptions(container, currency);
      }, DEBOUNCE_MS);

      debounceTimers.set(assumptionsId, timer);
    };

    topupInput.addEventListener('input', scheduleSave, { signal });
    apyInput.addEventListener('input', scheduleSave, { signal });

    setInlineError(container);
    setStatus(container, 'idle');
  });
}

function cleanupForecastAssumptions(): void {
  controller?.abort();
  controller = null;

  debounceTimers.forEach((timer) => clearTimeout(timer));
  debounceTimers.clear();

  requestControllers.forEach((requestController) => requestController.abort());
  requestControllers.clear();

  formatterHandles.forEach((handle) => handle.cleanup());
  formatterHandles.clear();
}

export { initForecastAssumptions, cleanupForecastAssumptions };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initForecastAssumptions, { once: true });
} else {
  initForecastAssumptions();
}

document.addEventListener('astro:page-load', initForecastAssumptions);
document.addEventListener('astro:before-swap', cleanupForecastAssumptions);
