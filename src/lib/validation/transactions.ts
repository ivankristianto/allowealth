import {
  check,
  date,
  forward,
  integer,
  maxLength,
  maxValue,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  regex,
  strictObject,
  string,
  transform,
  union,
  type BaseIssue,
  type BaseSchema,
  type InferInput,
  type InferOutput,
} from 'valibot';
import { currencyEnum, transactionTypeEnum } from '@/lib/enums';

/**
 * Validation schemas for Transaction operations
 */

// Re-export enums from shared location for convenience
export { currencyEnum, transactionTypeEnum };

const requiredId = (message: string) => pipe(string(), minLength(1, message));

const positiveAmountValidation = pipe(
  string(),
  minLength(1, 'Amount is required'),
  check((value) => {
    const parsedAmount = Number.parseFloat(value);
    return !Number.isNaN(parsedAmount) && parsedAmount > 0;
  }, 'Amount must be greater than 0')
);

const futureTransactionCheck = check(
  (value: Date) => value <= new Date(),
  'Transaction date cannot be in the future'
);

const transactionDateValidation = pipe(date(), futureTransactionCheck);
const transactionDateWithoutFutureValidation = date();

const dateStringValidation = pipe(
  string(),
  minLength(1, 'Transaction date is required'),
  regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  check((value) => {
    const parsedDate = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsedDate.getTime()) && parsedDate <= new Date();
  }, 'Invalid date or date cannot be in the future')
);

const limitValidation = optional(
  pipe(
    union([
      number(),
      pipe(
        string(),
        regex(/^-?\d+$/, 'Limit must be an integer'),
        transform((value) => Number(value))
      ),
    ]),
    integer('Limit must be an integer'),
    minValue(1, 'Limit must be at least 1'),
    maxValue(100, 'Limit cannot exceed 100')
  )
);

const offsetValidation = optional(
  pipe(
    union([
      number(),
      pipe(
        string(),
        regex(/^-?\d+$/, 'Offset must be an integer'),
        transform((value) => Number(value))
      ),
    ]),
    integer('Offset must be an integer'),
    minValue(0, 'Offset must be non-negative')
  )
);

const filterDateValidation = optional(
  pipe(
    union([
      date(),
      pipe(
        string(),
        transform((value) => new Date(value))
      ),
    ]),
    check((value) => !Number.isNaN(value.getTime()), 'Invalid date')
  )
);

function buildCreateTransactionSchema<TSchema extends BaseSchema<Date, Date, BaseIssue<unknown>>>(
  transactionDateSchema: TSchema
) {
  const baseSchema = strictObject({
    workspace_id: requiredId('Workspace ID is required'),
    created_by_user_id: requiredId('Created by user ID is required'),
    type: transactionTypeEnum,
    amount: positiveAmountValidation,
    currency: currencyEnum,
    category_id: optional(requiredId('Category ID is required')),
    account_id: requiredId('Account ID is required'),
    to_account_id: optional(requiredId('Destination account ID is required')),
    transaction_date: optional(transactionDateSchema, () => new Date()),
    description: optional(
      pipe(string(), maxLength(500, 'Description must not exceed 500 characters'))
    ),
  });

  return pipe(
    baseSchema,
    forward(
      check(
        (data: InferOutput<typeof baseSchema>) =>
          data.type !== 'transfer' || Boolean(data.to_account_id),
        'Destination account is required for transfers'
      ),
      ['to_account_id'] as any // eslint type resolution fails for generic schema paths
    ),
    forward(
      check(
        (data: InferOutput<typeof baseSchema>) =>
          data.type === 'transfer' || Boolean(data.category_id),
        'Category is required for expense/income transactions'
      ),
      ['category_id'] as any // eslint type resolution fails for generic schema paths
    )
  );
}

// Validation for transaction ID (nanoid format)
export const transactionIdSchema = pipe(
  string(),
  minLength(1, 'Transaction ID is required'),
  regex(/^[a-zA-Z0-9_-]+$/, 'Invalid transaction ID format')
);

// Schema for creating a transaction (for service layer)
export const createTransactionSchema = buildCreateTransactionSchema(transactionDateValidation);
export const createTransactionSchemaNoFutureDate = buildCreateTransactionSchema(
  transactionDateWithoutFutureValidation
);

export type CreateTransactionInput = InferInput<typeof createTransactionSchema>;

// Schema for updating a transaction (for service layer)
export const updateTransactionSchema = strictObject({
  type: optional(transactionTypeEnum),
  amount: optional(positiveAmountValidation),
  currency: optional(currencyEnum),
  category_id: optional(requiredId('Category ID is required')),
  account_id: optional(requiredId('Account ID is required')),
  to_account_id: optional(nullable(requiredId('Destination account ID is required'))),
  transaction_date: optional(transactionDateValidation),
  description: optional(
    pipe(string(), maxLength(500, 'Description must not exceed 500 characters'))
  ),
});

export type UpdateTransactionInput = InferInput<typeof updateTransactionSchema>;

// API-specific schemas that accept date strings (YYYY-MM-DD format)
// The form sends date-only strings, which are then converted to Date objects in the API handler
export const createTransactionAPISchema = pipe(
  strictObject({
    type: transactionTypeEnum,
    amount: positiveAmountValidation,
    currency: currencyEnum,
    category_id: optional(requiredId('Category ID is required')),
    account_id: requiredId('Account ID is required'),
    to_account_id: optional(requiredId('Destination account ID is required')),
    transaction_date: dateStringValidation,
    description: optional(
      pipe(string(), maxLength(500, 'Description must not exceed 500 characters'))
    ),
  }),
  forward(
    check(
      (data) => data.type !== 'transfer' || Boolean(data.to_account_id),
      'Destination account is required for transfers'
    ),
    ['to_account_id'] as const
  ),
  forward(
    check(
      (data) => data.type === 'transfer' || Boolean(data.category_id),
      'Category is required for expense/income transactions'
    ),
    ['category_id'] as const
  )
);

export const updateTransactionAPISchema = strictObject({
  type: optional(transactionTypeEnum),
  amount: optional(positiveAmountValidation),
  currency: optional(currencyEnum),
  category_id: optional(requiredId('Category ID is required')),
  account_id: optional(requiredId('Account ID is required')),
  to_account_id: optional(nullable(requiredId('Destination account ID is required'))),
  transaction_date: optional(dateStringValidation),
  description: optional(
    pipe(string(), maxLength(500, 'Description must not exceed 500 characters'))
  ),
});

// Schema for transaction filters
export const transactionFilterSchema = pipe(
  object({
    type: optional(transactionTypeEnum),
    category_id: optional(string()),
    account_id: optional(string()),
    currency: optional(currencyEnum),
    start_date: filterDateValidation,
    end_date: filterDateValidation,
    limit: limitValidation,
    offset: offsetValidation,
  }),
  forward(
    check(
      (data) =>
        data.start_date === undefined ||
        data.end_date === undefined ||
        data.end_date >= data.start_date,
      'End date must be after start date'
    ),
    ['end_date'] as const
  )
);

export type TransactionFilter = InferOutput<typeof transactionFilterSchema>;
