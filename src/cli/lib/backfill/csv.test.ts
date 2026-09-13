import { describe, expect, it } from 'bun:test';
import { parseCsv, parseAmount, isFootnote } from './csv';

describe('parseCsv', () => {
  it('keeps commas inside quoted fields', () => {
    expect(parseCsv('a,"1,234.00",b')[0]).toEqual(['a', '1,234.00', 'b']);
  });

  it('normalises CRLF and strips a BOM', () => {
    expect(parseCsv('﻿a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('preserves empty leading cells so column positions survive', () => {
    // TRAP 1: rows past the numbered block have a blank No column.
    expect(parseCsv(',Bank1 OwnerA,"100.00"')[0]).toEqual(['', 'Bank1 OwnerA', '100.00']);
  });
});

describe('parseAmount', () => {
  it('parses a plain thousands-separated amount', () => {
    expect(parseAmount('"1,234.00"')).toEqual({ kind: 'value', value: 1234 });
  });

  it('parses a currency-prefixed amount', () => {
    // TRAP 2: some cells carry a currency prefix.
    expect(parseAmount('Rp1,234,500.00')).toEqual({ kind: 'value', value: 1234500 });
  });

  it('treats parentheses as negative', () => {
    expect(parseAmount('(1,000.00)')).toEqual({ kind: 'value', value: -1000 });
  });

  it('reports blank as blank, never as zero', () => {
    expect(parseAmount('')).toEqual({ kind: 'blank' });
    expect(parseAmount('   ')).toEqual({ kind: 'blank' });
  });

  it('reports an unparseable cell as invalid, never as zero', () => {
    expect(parseAmount('n/a')).toEqual({ kind: 'invalid', raw: 'n/a' });
  });

  it('parses an explicit zero as a value', () => {
    expect(parseAmount('0.00')).toEqual({ kind: 'value', value: 0 });
  });
});

describe('isFootnote', () => {
  it('recognises the footnote markers that terminate the account table', () => {
    expect(isFootnote('* note')).toBe(true);
    expect(isFootnote('(....) note')).toBe(true);
    expect(isFootnote('.... note')).toBe(true);
    expect(isFootnote('Bank1 OwnerA')).toBe(false);
  });
});
