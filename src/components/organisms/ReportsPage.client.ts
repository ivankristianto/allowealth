/** Expenses report page: summary, charts, category table and member table. */

import {
  renderSummaryHtml,
  renderChartsHtml,
  renderTableHtml,
  renderMembersHtml,
} from './ReportsRenderer.client';
import { createReportPage, openCategoryDrillDown } from './report-page.client';
import { navigate } from 'astro:transitions/client';

/** Member spending rows carry data-href; links and buttons inside a row keep their own click. */
function handleRowClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (target.closest('a, button')) return;
  const href = target.closest<HTMLElement>('tr[data-href]')?.dataset.href;
  if (href) navigate(href);
}

createReportPage({
  selector: '[data-report-page="expenses"]',
  endpoint: '/api/reports',
  partials: [
    { name: 'summary', container: '[data-summary-container]', render: renderSummaryHtml },
    { name: 'charts', container: '[data-charts-container]', render: renderChartsHtml },
    { name: 'table', container: '[data-table-container]', render: renderTableHtml },
    { name: 'members', container: '[data-member-table-container]', render: renderMembersHtml },
  ],
  messages: {
    updated: 'report data updated',
    loadError: 'Failed to load report data. Please try again.',
  },
  clickHandlers: [openCategoryDrillDown, handleRowClick],
});
