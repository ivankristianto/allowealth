/**
 * Validation schemas for all transaction models
 *
 * Export all validation schemas for use in services and API endpoints
 */

// HTML validation patterns for form input validation
export {
  email,
  password as passwordPatterns,
  url,
  phone,
  creditCard,
  postalCode,
  numeric,
  date,
  username,
  patterns,
  type ValidationPattern,
  type PasswordPattern,
} from './patterns';

// Password validation constants (used by both client and server)
export {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  PASSWORD_REGEX_SOURCES,
  PASSWORD_ERROR_MESSAGES,
  PASSWORD_VALID_REGEX,
  isPasswordValid,
  getPasswordValidation,
  getPasswordStrength,
  PASSWORD_EXAMPLES,
} from './password';

// Client-side password validation (matches server-side validation)
export {
  validatePasswordClient,
  isPasswordValid as isPasswordValidClient,
} from './client-password';

// Client-side form validation (shared validation for registration and other forms)
export {
  validateName,
  validateEmail,
  validatePasswordRequirements,
  validatePassword,
  validatePasswordMatch,
  validateRegistrationForm,
  renderValidationErrors,
  escapeHtml as escapeHtmlClient,
  type ValidationResult,
} from '../client-validation';

// Shared enums (export once from central location)
export {
  currencyEnum,
  transactionTypeEnum,
  categoryTypeEnum,
  type Currency,
  type TransactionType,
  type CategoryType,
} from '@/lib/enums';

// Categories
export {
  createCategorySchema,
  updateCategorySchema,
  createCategoryAPISchema,
  updateCategoryAPISchema,
  categoryFilterSchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CategoryFilter,
} from './categories';

// Account Categories
export {
  createAccountCategorySchema,
  updateAccountCategorySchema,
  createAccountCategoryAPISchema,
  updateAccountCategoryAPISchema,
  accountCategoryFilterSchema,
  type CreateAccountCategoryInput,
  type UpdateAccountCategoryInput,
  type AccountCategoryFilter,
} from './account-categories';

// Transactions
export {
  createTransactionSchema,
  createTransactionSchemaNoFutureDate,
  updateTransactionSchema,
  createTransactionAPISchema,
  updateTransactionAPISchema,
  transactionFilterSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type TransactionFilter,
} from './transactions';

// Budgets
export {
  createBudgetSchema,
  updateBudgetSchema,
  copyBudgetsSchema,
  createBudgetAPISchema,
  updateBudgetAPISchema,
  copyBudgetsAPISchema,
  budgetFilterSchema,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type CopyBudgetsInput,
  type CreateBudgetAPIInput,
  type UpdateBudgetAPIInput,
  type CopyBudgetsAPIInput,
  initializeBudgetsSchema,
  initializeBudgetsAPISchema,
  type InitializeBudgetsInput,
  type InitializeBudgetsAPIInput,
  type BudgetFilter,
} from './budgets';

// Recurring
export {
  createRecurringTemplateSchema,
  updateRecurringTemplateSchema,
  confirmOccurrenceSchema,
  skipOccurrenceSchema,
  createRecurringTemplateAPISchema,
  updateRecurringTemplateAPISchema,
  confirmOccurrenceAPISchema,
  occurrenceStatusSchema,
  type CreateRecurringTemplateInput,
  type UpdateRecurringTemplateInput,
  type ConfirmOccurrenceInput,
  type SkipOccurrenceInput,
  type CreateRecurringTemplateAPIInput,
  type UpdateRecurringTemplateAPIInput,
  type ConfirmOccurrenceAPIInput,
} from './recurring';
