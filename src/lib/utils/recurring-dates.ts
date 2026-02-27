interface OccurrenceGenerationTemplate {
  total_occurrences: number | null | undefined;
  end_date: string | null | undefined;
}

function toUtcDate(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function toIsoDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateDueDate(
  startDate: Date | string,
  dayOfMonth: number,
  occurrenceOffset: number
): string {
  const start = toUtcDate(startDate);
  const target = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + occurrenceOffset, 1)
  );

  const daysInTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const resolvedDay = Math.min(Math.max(dayOfMonth, 1), daysInTargetMonth);
  target.setUTCDate(resolvedDay);

  return toIsoDate(target);
}

export function shouldGenerateOccurrence(
  template: OccurrenceGenerationTemplate,
  occurrenceNumber: number,
  targetDate: Date | string
): boolean {
  if (
    template.total_occurrences !== null &&
    template.total_occurrences !== undefined &&
    occurrenceNumber > template.total_occurrences
  ) {
    return false;
  }

  if (template.end_date) {
    const targetDateString =
      targetDate instanceof Date ? toIsoDate(toUtcDate(targetDate)) : targetDate;
    if (targetDateString > template.end_date) {
      return false;
    }
  }

  return true;
}

export function generateInstallmentDescription(
  name: string,
  label: string,
  occurrenceNumber: number,
  totalOccurrences: number
): string {
  const width = Math.max(String(totalOccurrences).length, 2);
  const occurrencePart = String(occurrenceNumber).padStart(width, '0');
  const totalPart = String(totalOccurrences).padStart(width, '0');
  return `${name} - ${label} ${occurrencePart}/${totalPart}`;
}
