/**
 * Custom error classes for service layer
 * Provides consistent error handling with error codes
 */

export enum ServiceErrorCode {
  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',

  // Transaction-specific errors
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  INVALID_TRANSACTION_ID = 'INVALID_TRANSACTION_ID',
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  CATEGORY_INACTIVE = 'CATEGORY_INACTIVE',
  ASSET_INACTIVE = 'ASSET_INACTIVE',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',

  // Category-specific errors
  CATEGORY_HAS_TRANSACTIONS = 'CATEGORY_HAS_TRANSACTIONS',
  INVALID_CATEGORY_TYPE = 'INVALID_CATEGORY_TYPE',

  // Budget-specific errors
  BUDGET_NOT_FOUND = 'BUDGET_NOT_FOUND',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  BUDGET_ALREADY_EXISTS = 'BUDGET_ALREADY_EXISTS',
  BUDGET_CLOSED = 'BUDGET_CLOSED',
  NO_BUDGETS_TO_COPY = 'NO_BUDGETS_TO_COPY',

  // Asset-specific errors
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',

  // Auth-specific errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_EXISTS = 'USER_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  WEAK_PASSWORD = 'WEAK_PASSWORD',

  // User meta-specific errors
  INVALID_META_KEY = 'INVALID_META_KEY',
  INVALID_META_VALUE = 'INVALID_META_VALUE',
  VALUE_TOO_LARGE = 'VALUE_TOO_LARGE',
  META_NOT_FOUND = 'META_NOT_FOUND',
}

export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class TransactionServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'TransactionServiceError';
  }
}

export class CategoryServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'CategoryServiceError';
  }
}

export class BudgetServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'BudgetServiceError';
  }
}

export class AuthServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string, statusCode: number = 401) {
    super(code, message, statusCode);
    this.name = 'AuthServiceError';
  }
}

export class AssetServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'AssetServiceError';
  }
}

export class UserServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'UserServiceError';
  }
}

export class UserMetaServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'UserMetaServiceError';
  }
}
