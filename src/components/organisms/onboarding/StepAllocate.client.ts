import {
  attachAmountFormatter,
  stripAmountFormatting,
  type AmountFormatterHandle,
} from '@/lib/formatting/amount-input';
import type { Currency } from '@/lib/constants/currency';

let controller: AbortController | null = null;
let formatterHandles: AmountFormatterHandle[] = [];

function cleanupFormatters() {
  formatterHandles.forEach((handle) => handle.cleanup());
  formatterHandles = [];
}

function initStepAllocate() {
  cleanupFormatters();
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const container = document.querySelector('[data-onboarding-allocate]');
  if (!container) return;

  const totalIncomeStr = container.getAttribute('data-allocation-total') || '0';
  const totalIncome = parseFloat(totalIncomeStr);
  const barFill = container.querySelector('[data-allocation-bar]') as HTMLElement | null;
  const remainingEl = container.querySelector('[data-allocation-remaining]') as HTMLElement | null;
  const allocatedEl = container.querySelector('[data-allocation-allocated]') as HTMLElement | null;
  const inputs = container.querySelectorAll<HTMLInputElement>('[data-amount-input]');

  function updateAllocation() {
    let allocated = 0;
    inputs.forEach((input) => {
      const inputCurrency = (input.dataset.amountCurrency as Currency | undefined) ?? 'IDR';
      const raw = stripAmountFormatting(input.value, inputCurrency);
      allocated += parseFloat(raw) || 0;
    });

    const remaining = totalIncome - allocated;
    const percent = totalIncome > 0 ? Math.min((allocated / totalIncome) * 100, 100) : 0;

    if (barFill) barFill.style.width = `${percent}%`;
    if (remainingEl) {
      remainingEl.textContent = remaining.toLocaleString();
      remainingEl.classList.toggle('text-error', remaining < 0);
    }
    if (allocatedEl) allocatedEl.textContent = allocated.toLocaleString();
  }

  inputs.forEach((input) => {
    const inputCurrency = (input.dataset.amountCurrency as Currency | undefined) ?? 'IDR';
    formatterHandles.push(attachAmountFormatter(input, inputCurrency));
    input.addEventListener('input', updateAllocation, { signal });
  });

  // Initial calculation
  updateAllocation();
}

document.addEventListener('astro:page-load', initStepAllocate);
document.addEventListener('astro:before-swap', () => {
  controller?.abort();
  cleanupFormatters();
});
