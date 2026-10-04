/**
 * Inline-SVG primitives for the schema doc diagrams.
 *
 * Boxes are table cards; each row is one column. Edges anchor on a box side at
 * a row's centre (rowY), so an arrow visibly leaves from the FK column it represents.
 * All colours come from CSS classes in template.html, so the SVG follows the page theme.
 */

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type RowKind = 'pk' | 'fk' | 'fkn' | 'money' | 'enum' | '';
export type BoxRow = [label: string, kind?: RowKind, hint?: string];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  rows: BoxRow[];
  /** Table carries workspace_id (drawn as a "ws" badge instead of an edge). */
  ws?: boolean;
}

const BOX_WIDTH = 220;
const HEADER_HEIGHT = 28;
const ROW_HEIGHT = 17;
const BOX_PADDING_BOTTOM = 8;

export function box(
  x: number,
  y: number,
  name: string,
  rows: BoxRow[],
  options: { ws?: boolean } = {}
): Box {
  return {
    x,
    y,
    w: BOX_WIDTH,
    h: HEADER_HEIGHT + rows.length * ROW_HEIGHT + BOX_PADDING_BOTTOM,
    name,
    rows,
    ws: options.ws,
  };
}

export const rowY = (b: Box, index: number) => b.y + HEADER_HEIGHT + index * ROW_HEIGHT + 8.5;
export const left = (b: Box) => b.x;
export const right = (b: Box) => b.x + b.w;
export const top = (b: Box) => b.y;
export const bottom = (b: Box) => b.y + b.h;
export const centerX = (b: Box) => b.x + b.w / 2;

const ROW_TAG: Record<RowKind, string> = {
  pk: 'PK',
  fk: 'FK',
  fkn: 'FK?',
  money: '¤',
  enum: '',
  '': '',
};

export function drawBox(b: Box): string {
  const rows = b.rows
    .map(([label, kind = '', hint], index) => {
      const baseline = b.y + HEADER_HEIGHT + index * ROW_HEIGHT + 12.5;
      const kindClass = kind || 'plain';
      const hintText = hint
        ? `<text class="d-hint" x="${b.x + b.w - 10}" y="${baseline}" text-anchor="end">${escapeHtml(hint)}</text>`
        : '';
      return (
        `<text class="d-tag d-tag-${kindClass}" x="${b.x + 10}" y="${baseline}">${escapeHtml(ROW_TAG[kind])}</text>` +
        `<text class="d-col d-col-${kindClass}" x="${b.x + 38}" y="${baseline}">${escapeHtml(label)}</text>` +
        hintText
      );
    })
    .join('');
  const headerPath = `M${b.x} ${b.y + 22}V${b.y + 5}a5 5 0 0 1 5-5H${b.x + b.w - 5}a5 5 0 0 1 5 5V${b.y + 22}Z`;
  const wsBadge = b.ws
    ? `<g class="d-ws"><rect x="${b.x + b.w - 30}" y="${b.y + 5}" width="22" height="13" rx="3"/><text x="${b.x + b.w - 19}" y="${b.y + 14.5}" text-anchor="middle">ws</text></g>`
    : '';
  return (
    `<g class="d-box"><rect class="d-body" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="5"/>` +
    `<path class="d-head" d="${headerPath}"/>` +
    `<line class="d-rule" x1="${b.x}" x2="${b.x + b.w}" y1="${b.y + 22}" y2="${b.y + 22}"/>` +
    `<text class="d-name" x="${b.x + 10}" y="${b.y + 15.5}">${escapeHtml(b.name)}</text>` +
    `${wsBadge}${rows}</g>`
  );
}

export type EdgeStyle = 'solid' | 'dashed' | 'key' | 'soft';

/** Path `d` in absolute M/H/V commands; the arrowhead sits on the last point. */
export function edge(path: string, style: EdgeStyle, markerPrefix: string): string {
  const marker = style === 'key' ? `${markerPrefix}-ak` : `${markerPrefix}-a`;
  return `<path class="d-edge d-${style}" d="${path}" marker-end="url(#${marker})"/>`;
}

/** Edge segments that join a bus line without their own arrowhead. */
export const plainPath = (path: string) => `<path class="d-edge d-solid" d="${path}"/>`;

export function edgeLabel(
  x: number,
  y: number,
  text: string,
  anchor: 'start' | 'middle' | 'end' = 'start',
  extraClass = ''
): string {
  return `<text class="d-elabel ${extraClass}" x="${x}" y="${y}" text-anchor="${anchor}">${escapeHtml(text)}</text>`;
}

export const junctionDot = (x: number, y: number) =>
  `<circle class="d-dot" cx="${x}" cy="${y}" r="2.5"/>`;

/** Arrowhead markers; ids are prefixed so several SVGs can share one page. */
export function markerDefs(prefix: string): string {
  const arrow = '<path d="M0 0L10 5L0 10Z" fill="currentColor"/>';
  const attrs =
    'viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"';
  return (
    `<defs><marker id="${prefix}-a" ${attrs}>${arrow}</marker>` +
    `<marker id="${prefix}-ak" class="d-mk-key" ${attrs}>${arrow}</marker></defs>`
  );
}

export function svg(
  viewWidth: number,
  viewHeight: number,
  ariaLabel: string,
  body: string
): string {
  return `<svg class="diagram" viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="${escapeHtml(ariaLabel)}">${body}</svg>`;
}
