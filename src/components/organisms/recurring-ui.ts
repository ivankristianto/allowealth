export type RecurringOccurrenceType = 'expense' | 'income';
export type RecurringActionType = 'confirm' | 'skip';
export type EndMode = 'none' | 'count' | 'date';

interface InstallmentStateInput {
  selectedEndMode: EndMode;
  totalOccurrencesValue: string;
  isInstallmentChecked: boolean;
  startingOccurrenceNumber: string;
  installmentLabel: string;
}

interface InstallmentStateOutput {
  enabled: boolean;
  checked: boolean;
  showFields: boolean;
  startingOccurrenceNumber: string;
  installmentLabel: string;
}

function getTimingNoun(type: RecurringOccurrenceType): string {
  return type === 'income' ? 'expected date' : 'due date';
}

function getTimingVerb(type: RecurringOccurrenceType): string {
  return type === 'income' ? 'Expected' : 'Due';
}

export function getOccurrenceDateLabel(type: RecurringOccurrenceType, dateLabel: string): string {
  return `${getTimingVerb(type)} on ${dateLabel}`;
}

export function getOccurrenceActionWarning(
  action: RecurringActionType,
  type: RecurringOccurrenceType
): string {
  return `You can only ${action} occurrences on or after the ${getTimingNoun(type)}`;
}

function getCurrentMonthHeadingLabel(now = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function getActionInboxTitle(
  selectedMonthLabel: string,
  currentMonthLabel = getCurrentMonthHeadingLabel()
): string {
  return selectedMonthLabel === currentMonthLabel
    ? 'Due This Month'
    : `Due in ${selectedMonthLabel.split(' ')[0].toUpperCase()}`;
}

export function normalizeInstallmentState(input: InstallmentStateInput): InstallmentStateOutput {
  const countValue = Number.parseInt(input.totalOccurrencesValue || '0', 10);
  const enabled = input.selectedEndMode === 'count' && countValue > 0;

  if (!enabled) {
    return {
      enabled: false,
      checked: false,
      showFields: false,
      startingOccurrenceNumber: '1',
      installmentLabel: 'Installment',
    };
  }

  return {
    enabled: true,
    checked: input.isInstallmentChecked,
    showFields: input.isInstallmentChecked,
    startingOccurrenceNumber: input.startingOccurrenceNumber || '1',
    installmentLabel: input.installmentLabel || 'Installment',
  };
}
