import { addToast } from '@/lib/stores/toastStore';
import { bindOccurrenceActions } from './recurring-occurrence-actions.client';

let controller: AbortController | null = null;

function initRecurringBillsWidget(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const widgetRoot = document.querySelector(
    '[data-dashboard-recurring-widget]'
  ) as HTMLElement | null;
  if (!widgetRoot) return;

  bindOccurrenceActions({
    signal,
    onMutated: (successMessage) => {
      addToast(successMessage, 'success');
      window.location.reload();
    },
    dateLabel: (_occurrence, formattedDate) => `Due on ${formattedDate}`,
    notDueWarning: (action) => `You can only ${action} occurrences on or after the due date`,
    isolateTriggerClicks: true,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRecurringBillsWidget);
} else {
  initRecurringBillsWidget();
}

document.addEventListener('astro:page-load', initRecurringBillsWidget);
document.addEventListener('astro:before-swap', () => {
  controller?.abort();
  controller = null;
});
