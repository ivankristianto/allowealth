import type { TransactionService } from '@/services/transaction.service';
import type { BudgetService } from '@/services/budget.service';
import type { AccountService } from '@/services/account.service';
import type { DashboardService } from '@/services/dashboard.service';
import type { CategoryService } from '@/services/category.service';

export interface ToolContext {
  auth: {
    workspaceId: string;
    userId: string;
    apiKeyId: string;
  };
  services: {
    transaction: TransactionService;
    budget: BudgetService;
    account: AccountService;
    dashboard: DashboardService;
    category: CategoryService;
  };
}
