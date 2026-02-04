import { db } from '@/db';
import { TransactionService } from '@/services/transaction.service';
import { BudgetService } from '@/services/budget.service';
import { AssetService } from '@/services/asset.service';
import { DashboardService } from '@/services/dashboard.service';
import { CategoryService } from '@/services/category.service';

export const transactionService = new TransactionService(db);
export const budgetService = new BudgetService(db);
export const assetService = new AssetService(db);
export const dashboardService = new DashboardService(db);
export const categoryService = new CategoryService(db);
