/**
 * Validation schemas for all transaction models
 *
 * Export all Zod schemas for use in services and API endpoints
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
  paymentMethodTypeEnum,
  type Currency,
  type TransactionType,
  type CategoryType,
  type PaymentMethodType,
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

// Payment Methods
export {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  createPaymentMethodAPISchema,
  updatePaymentMethodAPISchema,
  paymentMethodFilterSchema,
  type CreatePaymentMethodInput,
  type UpdatePaymentMethodInput,
  type PaymentMethodFilter,
} from './payment-methods';

// Transactions
export {
  createTransactionSchema,
  updateTransactionSchema,
  createTransactionAPISchema,
  updateTransactionAPISchema,
  transactionFilterSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type TransactionFilter,
} from './transactions';
