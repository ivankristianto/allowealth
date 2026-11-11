/** Income report page: summary, sources, members and a paged transaction history. */

import {
  renderSummaryHtml,
  renderSourcesHtml,
  renderMembersHtml,
  renderHistoryHtml,
} from './ReportsRenderer.client';
import {
  createReportPage,
  openCategoryDrillDown,
  type ReportPageController,
  type ReportPartial,
} from './report-page.client';

const history = {
  page: 1,
  pageSize: 25,
  sourceType: undefined as string | undefined,
  categoryId: undefined as string | undefined,
};

const historyPartial: ReportPartial = {
  name: 'history',
  container: '[data-history-container]',
  render: renderHistoryHtml,
};

function handleHistoryPageClick(event: MouseEvent, controller: ReportPageController): void {
  const btn = (event.target as HTMLElement).closest('[data-history-page]');
  if (!btn || btn.hasAttribute('disabled')) return;

  const direction = btn.getAttribute('data-history-page');
  if (direction === 'next') {
    history.page++;
  } else if (direction === 'prev' && history.page > 1) {
    history.page--;
  }

  void controller.fetchAndRender('history', [historyPartial], {
    announce: `Transaction history page ${history.page} loaded`,
    loadError: 'Failed to load transaction history.',
  });
}

createReportPage({
  selector: '[data-report-page="income"]',
  endpoint: '/api/reports/income',
  partials: [
    { name: 'summary', container: '[data-summary-container]', render: renderSummaryHtml },
    { name: 'sources', container: '[data-sources-container]', render: renderSourcesHtml },
    { name: 'members', container: '[data-member-table-container]', render: renderMembersHtml },
    historyPartial,
  ],
  messages: {
    updated: 'income report updated',
    loadError: 'Failed to load income data. Please try again.',
  },
  extendParams: (params) => {
    params.set('page', history.page.toString());
    params.set('pageSize', history.pageSize.toString());
    if (history.sourceType) params.set('source_type', history.sourceType);
    if (history.categoryId) params.set('category_id', history.categoryId);
  },
  onStateReset: () => {
    history.page = 1;
  },
  clickHandlers: [openCategoryDrillDown, handleHistoryPageClick],
});
