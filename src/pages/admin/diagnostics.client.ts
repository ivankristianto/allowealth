/**
 * Admin Diagnostics Page Client Script
 *
 * Handles refresh button functionality for the diagnostics page.
 * Shows loading state, fetches updated data, and displays toast notifications on error.
 */

import { addToast } from '@/lib/stores/toastStore';

export async function refreshDiagnostics() {
  const refreshButton = document.getElementById('refresh-diagnostics') as HTMLButtonElement | null;
  if (!refreshButton) return;

  // Disable button and show loading state
  refreshButton.disabled = true;
  const originalText = refreshButton.innerHTML;
  refreshButton.innerHTML = `
    <span class="loading loading-spinner loading-sm"></span>
    Refreshing...
  `;

  try {
    const response = await fetch('/api/admin/diagnostics', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh diagnostics: ${response.statusText}`);
    }

    // On success, reload the page to show updated data
    window.location.reload();
  } catch (err) {
    // On error, show toast notification
    const errorMessage = err instanceof Error ? err.message : 'Failed to refresh diagnostics';
    addToast(errorMessage, 'error');

    // Restore button state
    refreshButton.disabled = false;
    refreshButton.innerHTML = originalText;
  }
}

// Attach event listener to refresh button on load
const refreshButton = document.getElementById('refresh-diagnostics');
if (refreshButton) {
  refreshButton.addEventListener('click', refreshDiagnostics);
}
