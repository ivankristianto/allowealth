type RecurringFrequency = 'weekly' | 'monthly';
type FrequencyVariant = 'interval' | 'schedule';

const FREQUENCY_LABELS: Record<string, string> = {
  'weekly:1': 'Weekly',
  'weekly:2': 'Biweekly',
  'monthly:1': 'Monthly',
  'monthly:3': 'Quarterly',
  'monthly:6': 'Semi-annual',
  'monthly:12': 'Annual',
};

function daySuffix(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

export function formatRecurringFrequencyLabel(
  frequency: RecurringFrequency,
  intervalCount: number,
  options: {
    dayOfMonth?: number;
    variant?: FrequencyVariant;
  } = {}
): string {
  const variant = options.variant ?? 'interval';

  if (variant === 'schedule' && frequency === 'monthly' && intervalCount === 1) {
    return `Every ${daySuffix(options.dayOfMonth ?? 1)}`;
  }

  const key = `${frequency}:${intervalCount}`;
  if (FREQUENCY_LABELS[key]) return FREQUENCY_LABELS[key];

  const unit = frequency === 'weekly' ? 'weeks' : 'months';
  return `Every ${intervalCount} ${unit}`;
}
