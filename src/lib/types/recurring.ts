import type {
  Currency,
  RecurringTemplateStatus,
  RecurringOccurrenceStatus,
  TransactionType,
} from '@/lib/enums';

export interface RecurringTemplate {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  name: string;
  type: Exclude<TransactionType, 'transfer'>;
  amount: string;
  currency: Currency;
  category_id: string;
  account_id: string;
  day_of_month: number;
  frequency: 'weekly' | 'monthly';
  interval_count: number;
  start_date: string;
  end_date: string | null;
  total_occurrences: number | null;
  is_installment: boolean;
  installment_label: string | null;
  starting_occurrence_number: number;
  description: string | null;
  status: RecurringTemplateStatus;
  created_at: Date;
  updated_at: Date;
}

export interface RecurringTemplateOutput extends RecurringTemplate {
  category: {
    id: string;
    name: string;
    type: Exclude<TransactionType, 'transfer'>;
    icon: string;
    color: string;
  };
  account: {
    id: string;
    name: string;
    type: string;
  };
  nextDueDate: string | null;
  pendingCount: number;
  confirmedCount: number;
  skippedCount: number;
}

export interface RecurringOccurrence {
  id: string;
  template_id: string;
  workspace_id: string;
  due_date: string;
  occurrence_number: number;
  status: RecurringOccurrenceStatus;
  transaction_id: string | null;
  confirmed_amount: string | null;
  skip_reason: string | null;
  confirmed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface RecurringOccurrenceOutput extends RecurringOccurrence {
  templateName: string;
  templateType: Exclude<TransactionType, 'transfer'>;
  templateAmount: string;
  currency: Currency;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: Exclude<TransactionType, 'transfer'>;
  };
  account: {
    id: string;
    name: string;
    type: string;
  };
  isInstallment: boolean;
  installmentLabel: string | null;
  totalOccurrences: number | null;
}

export interface RecurringStats {
  pendingCount: number;
  pendingByCurrency: Array<{
    currency: Currency;
    amount: string;
  }>;
  overdueCount: number;
  confirmedThisMonth: number;
}

export interface RecurringCalendarDay {
  date: string;
  occurrences: RecurringOccurrenceOutput[];
}

export interface ForecastFilters {
  accountIds?: string[];
  type?: 'income' | 'expense';
  status?: 'active' | 'paused' | 'all';
}

export interface ForecastRow {
  templateId: string;
  templateName: string;
  templateType: Exclude<TransactionType, 'transfer'>;
  frequencyLabel: string;
  currency: Currency;
  status: RecurringTemplateStatus;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  account: {
    id: string;
    name: string;
  };
  months: Record<string, string | null>;
}

export interface ForecastCurrencyTotals {
  currency: Currency;
  months: Record<string, { income: string; expense: string; net: string }>;
}

export interface ForecastResult {
  rows: ForecastRow[];
  totals: ForecastCurrencyTotals[];
  monthKeys: string[];
}
