import type { IDatabase } from '@/db';
import { TransactionService } from '@/services/transaction.service';
import { BudgetService } from '@/services/budget.service';
import { AssetService } from '@/services/asset.service';
import { DashboardService } from '@/services/dashboard.service';
import { CategoryService } from '@/services/category.service';

export interface McpServices {
  transaction: TransactionService;
  budget: BudgetService;
  asset: AssetService;
  dashboard: DashboardService;
  category: CategoryService;
}

export function createServices(db: IDatabase): McpServices {
  return {
    transaction: new TransactionService(db),
    budget: new BudgetService(db),
    asset: new AssetService(db),
    dashboard: new DashboardService(db),
    category: new CategoryService(db),
  };
}
