import { describe, expect, it } from 'bun:test';

import { sanitizeCellForCsv } from './sanitize-cell-for-csv';

describe('sanitizeCellForCsv', () => {
  it('prefixes formula-leading values with a single quote', () => {
    expect(sanitizeCellForCsv('=2+2')).toBe("'=2+2");
    expect(sanitizeCellForCsv(' +SUM(A1:A2)')).toBe("' +SUM(A1:A2)");
    expect(sanitizeCellForCsv('-100')).toBe("'-100");
    expect(sanitizeCellForCsv('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('leaves normal values unchanged', () => {
    expect(sanitizeCellForCsv('normal text')).toBe('normal text');
    expect(sanitizeCellForCsv(123)).toBe('123');
    expect(sanitizeCellForCsv(null)).toBe('');
  });
});
