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
  PAYMENT_METHOD_NOT_FOUND = 'PAYMENT_METHOD_NOT_FOUND',
  PAYMENT_METHOD_INACTIVE = 'PAYMENT_METHOD_INACTIVE',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',

  // Category-specific errors
  CATEGORY_HAS_TRANSACTIONS = 'CATEGORY_HAS_TRANSACTIONS',
  INVALID_CATEGORY_TYPE = 'INVALID_CATEGORY_TYPE',

  // Payment method-specific errors
  PAYMENT_METHOD_HAS_TRANSACTIONS = 'PAYMENT_METHOD_HAS_TRANSACTIONS',

  // Budget-specific errors
  BUDGET_NOT_FOUND = 'BUDGET_NOT_FOUND',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',

  // Asset-specific errors
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',

  // Auth-specific errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_EXISTS = 'USER_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
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

export class PaymentMethodServiceError extends ServiceError {
  constructor(code: ServiceErrorCode, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'PaymentMethodServiceError';
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
