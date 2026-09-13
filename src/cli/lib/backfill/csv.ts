import type { Amount } from './types';

/**
 * Splits one CSV line, honouring quoted fields and doubled quotes.
 *
 * Empty cells are preserved, so column positions survive rows whose leading
 * cells are blank — the account table depends on this.
 */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseCsv(text: string): string[][] {
  return text
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(parseCsvLine);
}

const CURRENCY_PREFIX = /^(rp|idr|usd|sgd)\s*/i;

/**
 * Parses an amount cell.
 *
 * Blank and unparseable results are distinct from zero: a defect in a future
 * export aborts the run rather than being recorded as a zero-value row.
 */
export function parseAmount(raw: string): Amount {
  const trimmed = (raw ?? '').trim().replace(/^"|"$/g, '').trim();
  if (trimmed === '') return { kind: 'blank' };

  const negative = /^\(.*\)$/.test(trimmed);
  let body = negative ? trimmed.slice(1, -1) : trimmed;
  body = body.replace(CURRENCY_PREFIX, '').replace(/[$\s]/g, '').replace(/,/g, '');

  if (body === '' || !/^-?\d+(\.\d+)?$/.test(body)) {
    return { kind: 'invalid', raw };
  }
  const value = Number(body);
  if (!Number.isFinite(value)) return { kind: 'invalid', raw };
  return { kind: 'value', value: negative ? -value : value };
}

/** Footnote markers terminate the account table; the row-number column does not. */
export function isFootnote(cell: string): boolean {
  const t = (cell ?? '').trim();
  return t.startsWith('*') || t.startsWith('(') || t.startsWith('....');
}
