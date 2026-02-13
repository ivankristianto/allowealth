import { describe, expect, it } from 'bun:test';
import { parseBudgetOverviewHtmlPartials } from './budgetApiClient';

describe('parseBudgetOverviewHtmlPartials', () => {
  it('parses copy-action partial alongside summary and cards', () => {
    const html = [
      '<!-- PARTIAL:summary -->',
      '<div>summary</div>',
      '<!-- PARTIAL:copy-action -->',
      '<button>copy</button>',
      '<!-- PARTIAL:cards -->',
      '<div>cards</div>',
    ].join('\n');

    expect(parseBudgetOverviewHtmlPartials(html)).toEqual({
      summary: '<div>summary</div>',
      copyAction: '<button>copy</button>',
      cards: '<div>cards</div>',
    });
  });

  it('returns empty partials when markers are missing', () => {
    expect(parseBudgetOverviewHtmlPartials('<div>no markers</div>')).toEqual({});
  });
});
