/**
 * Compound interest calculator: posts the form and swaps in the server-rendered results partial.
 */

import { csrfFetch } from '@/lib/csrf-client';
import { attachAmountFormatter, stripAmountFormatting } from '@/lib/formatting/amount-input';
import { isValidCurrency, type Currency } from '@/lib/constants/currency';
import { replaceWithSanitizedHtml, sanitizeHtmlFragment } from '@/lib/dom/sanitize-fragment';

let controller: AbortController | null = null;
let primaryCurrency: Currency = 'IDR';

function getCalculatorForm(): HTMLFormElement | null {
  return document.getElementById('compound-calculator-form') as HTMLFormElement | null;
}

function getResultsContainer(): HTMLElement | null {
  return document.getElementById('results-container');
}

function renderResultsHtml(html: string): void {
  const resultsContainer = getResultsContainer();
  if (!resultsContainer) return;

  replaceWithSanitizedHtml(resultsContainer, html);
  resultsContainer.classList.remove('hidden');
  resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const cards = resultsContainer.querySelectorAll('[id$="-card"]');
  cards.forEach((card, i) => {
    card.animate(
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      {
        duration: 300,
        delay: i * 100,
        easing: 'ease-out',
        fill: 'forwards',
      }
    );
  });
}

/** Error responses in HTML mode are an alert fragment; show its text in the form's own alert. */
function readErrorMessage(html: string): string {
  return sanitizeHtmlFragment(html).textContent?.trim() || 'Calculation failed.';
}

// Show loading state
function showLoadingState(): void {
  const form = getCalculatorForm();
  if (!form) return;
  const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add('btn-disabled', 'opacity-70', 'cursor-not-allowed');
  }
}

// Hide loading state
function hideLoadingState(): void {
  const form = getCalculatorForm();
  if (!form) return;
  const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.classList.remove('btn-disabled', 'opacity-70', 'cursor-not-allowed');
  }
}

// Show error message
function showError(message: string): void {
  const form = getCalculatorForm();

  // Check if there's already an error alert
  let errorAlert = document.getElementById('calculator-error');
  if (!errorAlert) {
    errorAlert = document.createElement('div');
    errorAlert.id = 'calculator-error';
    errorAlert.className = 'alert alert-error rounded-xl mb-6';
    errorAlert.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span></span>
    `;
    form?.prepend(errorAlert);
  }

  const messageSpan = errorAlert.querySelector('span');
  if (messageSpan) {
    messageSpan.textContent = message;
  }

  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorAlert?.remove();
  }, 5000);
}

// Form submission handler
async function handleFormSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const form = getCalculatorForm();
  if (!form) return;

  const formData = new FormData(form);
  const principalRaw = String(formData.get('principal') || '');
  const principal = parseFloat(stripAmountFormatting(principalRaw, primaryCurrency));
  const rate = parseFloat(formData.get('rate') as string);
  const years = parseInt(formData.get('years') as string);

  // Client-side validation
  if (isNaN(principal) || isNaN(rate) || isNaN(years)) {
    showError('Please fill in all fields with valid numbers.');
    return;
  }

  if (principal < 0 || rate < 0 || years < 1) {
    showError('Please enter positive values.');
    return;
  }

  showLoadingState();

  try {
    const response = await csrfFetch('/api/calculators/compound?_render=html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ principal, rate, years }),
    });

    const html = await response.text();

    if (!response.ok) {
      showError(readErrorMessage(html));
      return;
    }

    renderResultsHtml(html);
  } catch (error) {
    console.error('Error calculating compound interest:', error);
    showError('Failed to calculate. Please try again.');
  } finally {
    hideLoadingState();
  }
}

function initCalculatorsPage(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const form = getCalculatorForm();
  if (!form) return;

  // Read primary currency from form data attribute
  const currencyAttr = form.dataset.primaryCurrency;
  primaryCurrency = currencyAttr && isValidCurrency(currencyAttr) ? currencyAttr : 'IDR';

  const principalInput = form.querySelector('input[name="principal"]') as HTMLInputElement | null;
  if (principalInput) {
    attachAmountFormatter(principalInput, primaryCurrency);
  }

  form.addEventListener('submit', handleFormSubmit, { signal });
}

initCalculatorsPage();
document.addEventListener('astro:page-load', initCalculatorsPage);
document.addEventListener('astro:before-swap', () => {
  controller?.abort();
});

export {};
