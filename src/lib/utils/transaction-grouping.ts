import type { TransactionOutput } from '@/lib/types/transaction';

export interface DateGroup {
  label: string;
  dateKey: string;
  transactions: TransactionOutput[];
}

/**
 * Parse a transaction_date (Date object or ISO string) to local date components.
 * Avoids timezone shift by parsing as local date.
 */
function parseLocalDate(dateStr: string | Date): { year: number; month: number; day: number } {
  if (dateStr instanceof Date) {
    return { year: dateStr.getFullYear(), month: dateStr.getMonth(), day: dateStr.getDate() };
  }
  const str = String(dateStr).split('T')[0];
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDateLabel(year: number, month: number, day: number): string {
  const now = new Date();
  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  const dateKey = toDateKey(year, month, day);

  if (dateKey === todayKey) return 'Today';

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = toDateKey(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  );
  if (dateKey === yesterdayKey) return 'Yesterday';

  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Group transactions by date, ordered by date descending (most recent first).
 * Preserves original order of transactions within each date group.
 */
export function groupTransactionsByDate(transactions: TransactionOutput[]): DateGroup[] {
  if (transactions.length === 0) return [];

  const groupMap = new Map<string, { label: string; transactions: TransactionOutput[] }>();
  const dateOrder: string[] = [];

  for (const tx of transactions) {
    const { year, month, day } = parseLocalDate(tx.transaction_date);
    const key = toDateKey(year, month, day);

    if (!groupMap.has(key)) {
      groupMap.set(key, { label: formatDateLabel(year, month, day), transactions: [] });
      dateOrder.push(key);
    }
    groupMap.get(key)!.transactions.push(tx);
  }

  // Sort date keys descending
  dateOrder.sort((a, b) => b.localeCompare(a));

  return dateOrder.map((key) => ({
    dateKey: key,
    label: groupMap.get(key)!.label,
    transactions: groupMap.get(key)!.transactions,
  }));
}
