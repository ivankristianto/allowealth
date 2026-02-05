import type { TransactionService } from '@/services/transaction.service';
import type { BudgetService } from '@/services/budget.service';
import type { AssetService } from '@/services/asset.service';
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
    asset: AssetService;
    dashboard: DashboardService;
    category: CategoryService;
  };
}
