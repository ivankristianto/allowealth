import type { Database } from '@/db';
import { TransactionService } from '@/services/transaction.service';
import { BudgetService } from '@/services/budget.service';
import { AccountService } from '@/services/account.service';
import { DashboardService } from '@/services/dashboard.service';
import { CategoryService } from '@/services/category.service';
import { McpAppPasswordService } from '@/services/mcp-app-password.service';

export interface McpServices {
  transaction: TransactionService;
  budget: BudgetService;
  account: AccountService;
  dashboard: DashboardService;
  category: CategoryService;
  appPassword: McpAppPasswordService;
}

export function createServices(db: Database): McpServices {
  return {
    transaction: new TransactionService(db),
    budget: new BudgetService(db),
    account: new AccountService(db),
    dashboard: new DashboardService(db),
    category: new CategoryService(db),
    appPassword: new McpAppPasswordService(db),
  };
}
