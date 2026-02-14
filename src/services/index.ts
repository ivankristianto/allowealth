/**
 * Service singleton exports
 *
 * This module exports singleton instances of all services with the real database.
 * These are used in production code.
 *
 * For tests, use the service classes directly with injected mock databases:
 * ```ts
 * import { CategoryService } from '@/services/category.service';
 * const mockDb = createMockDatabase();
 * const service = new CategoryService(mockDb);
 * ```
 */

import { db } from '@/db';

// Import service classes
import { CategoryService } from './category.service';
import { TransactionService } from './transaction.service';
import { AssetService } from './asset.service';
import { AssetCategoryService } from './asset-category.service';
import { BudgetService } from './budget.service';
import { DashboardService } from './dashboard.service';
import { UserService } from './user.service';
import { UserMetaService } from './user-meta.service';
import { ReportService } from './report.service';
import { WorkspaceService } from './workspace.service';
import { WorkspaceMetaService } from './workspace-meta.service';
import { WorkspaceInvitationService } from './workspace-invitation.service';
import { ApiKeyService } from './api-key.service';
import { EmailService } from './email';
import { EmailVerificationService } from './email-verification.service';
import { SuperAdminService } from './super-admin.service';

// Re-export types and utilities
export * from './transaction.service';
export * from './category.service';
export * from './asset.service';
export * from './asset-category.service';
export * from './budget.service';
export * from './auth.service';
export * from './dashboard.service';
export * from './user.service';
export * from './user-meta.service';
export * from './report.service';
export * from './workspace.service';
export * from './workspace-meta.service';
export * from './workspace-invitation.service';
export * from './service-errors';
export * from './api-key.service';
export * from './email';
export * from './email-verification.service';
export * from './super-admin.service';

// Export singleton instances with real database
export const categoryService = new CategoryService(db);
export const transactionService = new TransactionService(db);
export const assetService = new AssetService(db);
export const assetCategoryService = new AssetCategoryService(db);
export const budgetService = new BudgetService(db);
export const dashboardService = new DashboardService(db);
export const userService = new UserService(db);
export const userMetaService = new UserMetaService(db);
export const reportService = new ReportService(db);
export const workspaceService = new WorkspaceService(db);
export const workspaceMetaService = new WorkspaceMetaService(db);
export const workspaceInvitationService = new WorkspaceInvitationService(db);
export const apiKeyService = new ApiKeyService(db);
export const emailService = new EmailService();
export const emailVerificationService = new EmailVerificationService(db, emailService);
export const superAdminService = new SuperAdminService(db);
