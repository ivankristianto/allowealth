import type { IDatabase } from '@/db';
import { TransactionService } from '@/services/transaction.service';
import { BudgetService } from '@/services/budget.service';
import { AccountService } from '@/services/account.service';
import { DashboardService } from '@/services/dashboard.service';
import { CategoryService } from '@/services/category.service';

export interface McpServices {
  transaction: TransactionService;
  budget: BudgetService;
  account: AccountService;
  dashboard: DashboardService;
  category: CategoryService;
}

export function createServices(db: IDatabase): McpServices {
  return {
    transaction: new TransactionService(db),
    budget: new BudgetService(db),
    account: new AccountService(db),
    dashboard: new DashboardService(db),
    category: new CategoryService(db),
  };
}
