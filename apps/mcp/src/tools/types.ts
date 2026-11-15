import type { TransactionService } from '@/services/transaction.service';
import type { BudgetService } from '@/services/budget.service';
import type { AccountService } from '@/services/account.service';
import type { DashboardService } from '@/services/dashboard.service';
import type { CategoryService } from '@/services/category.service';
import type { McpAppPasswordService } from '@/services/mcp-app-password.service';
import type { McpAuthContext } from '@/lib/mcp-auth';
import type { TokenRateLimit } from '@/lib/mcp-rate-limit';

export interface ToolContext {
  auth: McpAuthContext;
  /** The limit this transport applies to the token, or null where none applies (stdio). */
  rateLimit: TokenRateLimit | null;
  services: {
    transaction: TransactionService;
    budget: BudgetService;
    account: AccountService;
    dashboard: DashboardService;
    category: CategoryService;
    appPassword: Pick<McpAppPasswordService, 'findForUser'>;
  };
}
