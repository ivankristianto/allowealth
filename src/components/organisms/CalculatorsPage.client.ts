/**
 * Calculator Page Client Script
 *
 * Handles form submission, fetches results from API, and renders HTML.
 * Uses server-side calculations with client-side HTML rendering.
 */

import { csrfFetch } from '@/lib/csrf-client';
// @TODO: P2 - Use import alias syntax instead of re-export
import { formatCurrency } from '@/lib/formatting/currency-client';
import { attachAmountFormatter, stripAmountFormatting } from '@/lib/formatting/amount-input';

let controller: AbortController | null = null;

function getCalculatorForm(): HTMLFormElement | null {
  return document.getElementById('compound-calculator-form') as HTMLFormElement | null;
}

function getResultsContainer(): HTMLElement | null {
  return document.getElementById('results-container');
}

/**
 * Render results HTML
 * SECURITY NOTE: All interpolated values in the HTML templates below are numeric types
 * processed through formatCurrency(). Never interpolate raw strings without proper escaping.
 * @TODO: P2 - Consider migrating to server-rendered HTML fragments per ADR-002.
 */
function renderResults(data: {
  totalInterest: number;
  finalBalance: number;
  yearlyData: Array<{
    year: number;
    openingBalance: number;
    interest: number;
    closingBalance: number;
  }>;
  currency: 'IDR' | 'USD';
}): void {
  const resultsContainer = getResultsContainer();
  if (!resultsContainer) return;

  const { totalInterest, finalBalance, yearlyData, currency } = data;

  // Generate summary cards HTML
  const summaryCardsHtml = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div id="total-interest-card" class="p-6 rounded-3xl border bg-success/10 border-success/20 text-success">
        <p class="text-xs font-bold uppercase tracking-widest mb-2 opacity-80">Total Interest</p>
        <h4 class="text-2xl font-bold">${formatCurrency(totalInterest, currency)}</h4>
      </div>
      <div id="final-balance-card" class="p-6 rounded-3xl border bg-primary/10 border-primary/20 text-primary">
        <p class="text-xs font-bold uppercase tracking-widest mb-2 opacity-80">Final Balance</p>
        <h4 class="text-2xl font-bold">${formatCurrency(finalBalance, currency)}</h4>
      </div>
    </div>
  `;

  // Generate growth schedule table HTML
  const tableRowsHtml = yearlyData
    .map(
      (row) => `
    <tr class="hover:bg-base-200/50 transition-colors">
      <td class="px-6 py-4">
        <span class="text-sm font-bold text-base-content">Year ${row.year}</span>
      </td>
      <td class="px-6 py-4 text-right">
        <span class="text-sm font-medium text-base-content/60">
          ${formatCurrency(row.openingBalance, currency)}
        </span>
      </td>
      <td class="px-6 py-4 text-right">
        <span class="text-sm font-bold text-success">+</span>
        <span class="text-sm font-bold text-success ml-1">
          ${formatCurrency(row.interest, currency)}
        </span>
      </td>
      <td class="px-6 py-4 text-right">
        <span class="text-sm font-bold text-base-content">
          ${formatCurrency(row.closingBalance, currency)}
        </span>
      </td>
    </tr>
  `
    )
    .join('');

  const tableHtml = `
    <div id="growth-schedule-table" class="bg-base-100 rounded-card border border-base-300 overflow-hidden">
      <div class="p-6 border-b border-base-300">
        <h4 class="font-bold text-base-content tracking-tight">Growth Schedule</h4>
        <p class="text-xs font-bold uppercase tracking-widest text-base-content/50 mt-1">
          Yearly breakdown of interest compounding
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full text-left">
          <thead>
            <tr class="bg-base-200">
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-widest text-base-content/50">
                Year
              </th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-widest text-base-content/50 text-right">
                Opening Balance
              </th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-widest text-success text-right">
                Interest Earned
              </th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-widest text-base-content text-right">
                Closing Balance
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-base-300">
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Inject HTML
  resultsContainer.innerHTML = `<div id="calculator-results" class="space-y-8">${summaryCardsHtml}${tableHtml}</div>`;

  // Reveal the results section
  resultsContainer.classList.remove('hidden');

  // Smooth scroll to results
  resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Animate results in
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
  const principal = parseFloat(stripAmountFormatting(principalRaw, 'IDR'));
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
    const response = await csrfFetch('/api/calculators/compound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ principal, rate, years }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      showError(result.error?.message || 'Calculation failed.');
      return;
    }

    renderResults(result.data);
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

  const principalInput = form.querySelector('input[name="principal"]') as HTMLInputElement | null;
  if (principalInput && principalInput.dataset.amountFormatterInitialized !== 'true') {
    attachAmountFormatter(principalInput, 'IDR');
    principalInput.dataset.amountFormatterInitialized = 'true';
  }

  form.addEventListener('submit', handleFormSubmit, { signal });
}

initCalculatorsPage();
document.addEventListener('astro:page-load', initCalculatorsPage);
document.addEventListener('astro:before-swap', () => {
  controller?.abort();
});

export {};
