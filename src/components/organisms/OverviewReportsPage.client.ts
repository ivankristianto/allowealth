/** Reports overview page: summary, charts, wealth and preview cards. */

import {
  renderSummaryHtml,
  renderChartsHtml,
  renderPreviewsHtml,
  renderWealthHtml,
} from './ReportsRenderer.client';
import { createReportPage } from './report-page.client';

createReportPage({
  selector: '[data-report-page="overview"]',
  endpoint: '/api/reports',
  partials: [
    { name: 'summary', container: '[data-summary-container]', render: renderSummaryHtml },
    { name: 'charts', container: '[data-charts-container]', render: renderChartsHtml },
    { name: 'wealth', container: '[data-wealth-container]', render: renderWealthHtml },
    { name: 'previews', container: '[data-previews-container]', render: renderPreviewsHtml },
  ],
  messages: {
    updated: 'overview data updated',
    loadError: 'Failed to load overview data. Please try again.',
  },
});
