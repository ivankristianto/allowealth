import {
  boolean,
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
  optional,
  picklist,
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
import {
  currencyEnum,
  recurringTemplateStatusEnum,
  recurringOccurrenceStatusEnum,
  categoryTypeEnum,
} from '@/lib/enums';

const requiredId = (message: string) => pipe(string(), minLength(1, message));

const dateStringValidation = pipe(
  string(),
  regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  check((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date')
);

const amountValidation = pipe(
  string(),
  minLength(1, 'Amount is required'),
  check((value) => {
    const parsedAmount = Number.parseFloat(value);
    return Number.isFinite(parsedAmount) && parsedAmount > 0;
  }, 'Amount must be greater than 0')
);

const frequencyEnum = picklist(['weekly', 'monthly']);

const dayOfMonthValidation = pipe(
  number(),
  integer('Day of month must be an integer'),
  minValue(1, 'Day of month must be between 1 and 31'),
  maxValue(31, 'Day of month must be between 1 and 31')
);

const intervalCountValidation = pipe(
  number(),
  integer('Interval count must be an integer'),
  minValue(1, 'Interval count must be between 1 and 52'),
  maxValue(52, 'Interval count must be between 1 and 52')
);

const totalOccurrencesValidation = pipe(
  number(),
  integer('Total occurrences must be an integer'),
  minValue(1, 'Total occurrences must be at least 1')
);

const startingOccurrenceValidation = pipe(
  number(),
  integer('Starting occurrence number must be an integer'),
  minValue(1, 'Starting occurrence number must be at least 1')
);

function coercedInteger(label: string, minimum: number, maximum?: number) {
  const baseSchema = pipe(
    union([number(), pipe(string(), regex(/^-?\d+$/, `${label} must be an integer`))]),
    transform((value) => Number(value)),
    number(),
    integer(`${label} must be an integer`),
    minValue(minimum, `${label} must be at least ${minimum}`)
  );

  if (maximum === undefined) {
    return baseSchema;
  }

  return pipe(baseSchema, maxValue(maximum, `${label} must be at most ${maximum}`));
}

const coercedBoolean = optional(
  union([
    boolean(),
    pipe(
      picklist(['true', 'false']),
      transform((value) => value === 'true')
    ),
  ])
);

function refineRecurringTemplate<TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
  schema: TSchema
) {
  return pipe(
    schema,
    forward(
      check(
        (data: { frequency?: 'weekly' | 'monthly'; day_of_month?: number | null }) =>
          data.frequency === 'weekly' || data.day_of_month !== undefined,
        'Day of month is required for monthly frequency'
      ),
      ['day_of_month'] as const
    ),
    forward(
      check(
        (data: { is_installment?: boolean; total_occurrences?: number | null }) =>
          !data.is_installment || Boolean(data.total_occurrences),
        'Installments require total occurrences'
      ),
      ['total_occurrences'] as const
    ),
    forward(
      check(
        (data: { total_occurrences?: number | null; starting_occurrence_number?: number }) =>
          data.total_occurrences === undefined ||
          data.total_occurrences === null ||
          (data.starting_occurrence_number ?? 1) <= data.total_occurrences,
        'Starting occurrence number must be less than or equal to total occurrences'
      ),
      ['starting_occurrence_number'] as const
    )
  ) as unknown as TSchema;
}

const recurringTemplateBaseEntries = {
  name: pipe(
    string(),
    minLength(1, 'Name is required'),
    maxLength(200, 'Name must not exceed 200 characters')
  ),
  type: categoryTypeEnum,
  amount: amountValidation,
  currency: currencyEnum,
  category_id: requiredId('Category is required'),
  account_id: requiredId('Account is required'),
  day_of_month: optional(dayOfMonthValidation),
  frequency: optional(frequencyEnum, 'monthly'),
  interval_count: optional(intervalCountValidation, 1),
  start_date: dateStringValidation,
  end_date: optional(dateStringValidation),
  total_occurrences: optional(totalOccurrencesValidation),
  is_installment: optional(boolean(), false),
  installment_label: optional(
    pipe(string(), maxLength(100, 'Installment label must not exceed 100 characters'))
  ),
  starting_occurrence_number: optional(startingOccurrenceValidation, 1),
  description: optional(
    pipe(string(), maxLength(500, 'Description must not exceed 500 characters'))
  ),
  status: optional(recurringTemplateStatusEnum, 'active'),
} as const;

// Service layer schemas
export const createRecurringTemplateSchema = refineRecurringTemplate(
  strictObject({
    workspace_id: requiredId('Workspace ID is required'),
    created_by_user_id: requiredId('Created by user ID is required'),
    ...recurringTemplateBaseEntries,
  })
);

export const updateRecurringTemplateSchema = strictObject({
  workspace_id: requiredId('Workspace ID is required'),
  name: optional(pipe(string(), minLength(1), maxLength(200))),
  type: optional(categoryTypeEnum),
  amount: optional(amountValidation),
  currency: optional(currencyEnum),
  category_id: optional(requiredId('Category is required')),
  account_id: optional(requiredId('Account is required')),
  day_of_month: optional(dayOfMonthValidation),
  frequency: optional(frequencyEnum),
  interval_count: optional(intervalCountValidation),
  start_date: optional(dateStringValidation),
  end_date: optional(nullable(dateStringValidation)),
  total_occurrences: optional(nullable(totalOccurrencesValidation)),
  is_installment: optional(boolean()),
  installment_label: optional(nullable(pipe(string(), maxLength(100)))),
  starting_occurrence_number: optional(startingOccurrenceValidation),
  description: optional(nullable(pipe(string(), maxLength(500)))),
});

export const confirmOccurrenceSchema = strictObject({
  amount: amountValidation,
  transaction_date: date(),
  category_id: requiredId('Category ID is required'),
  account_id: requiredId('Account ID is required'),
  workspace_id: requiredId('Workspace ID is required'),
  user_id: requiredId('User ID is required'),
});

export const skipOccurrenceSchema = strictObject({
  skip_reason: optional(
    pipe(string(), maxLength(200, 'Skip reason must not exceed 200 characters'))
  ),
});

// API layer schemas
export const createRecurringTemplateAPISchema = refineRecurringTemplate(
  strictObject({
    name: pipe(
      string(),
      minLength(1, 'Name is required'),
      maxLength(200, 'Name must not exceed 200 characters')
    ),
    type: categoryTypeEnum,
    amount: amountValidation,
    currency: currencyEnum,
    category_id: requiredId('Category is required'),
    account_id: requiredId('Account is required'),
    day_of_month: optional(coercedInteger('Day of month', 1, 31)),
    frequency: optional(frequencyEnum, 'monthly'),
    interval_count: optional(coercedInteger('Interval count', 1, 52), 1),
    start_date: dateStringValidation,
    end_date: optional(dateStringValidation),
    total_occurrences: optional(coercedInteger('Total occurrences', 1)),
    is_installment: optional(
      union([
        boolean(),
        pipe(
          picklist(['true', 'false']),
          transform((value) => value === 'true')
        ),
      ]),
      false
    ),
    installment_label: optional(
      pipe(string(), maxLength(100, 'Installment label must not exceed 100 characters'))
    ),
    starting_occurrence_number: optional(coercedInteger('Starting occurrence number', 1), 1),
    description: optional(
      pipe(string(), maxLength(500, 'Description must not exceed 500 characters'))
    ),
    status: optional(recurringTemplateStatusEnum, 'active'),
  })
);

export const updateRecurringTemplateAPISchema = strictObject({
  name: optional(pipe(string(), minLength(1), maxLength(200))),
  type: optional(categoryTypeEnum),
  amount: optional(amountValidation),
  currency: optional(currencyEnum),
  category_id: optional(requiredId('Category is required')),
  account_id: optional(requiredId('Account is required')),
  day_of_month: optional(coercedInteger('Day of month', 1, 31)),
  frequency: optional(frequencyEnum),
  interval_count: optional(coercedInteger('Interval count', 1, 52)),
  start_date: optional(dateStringValidation),
  end_date: optional(nullable(dateStringValidation)),
  total_occurrences: optional(nullable(coercedInteger('Total occurrences', 1))),
  is_installment: coercedBoolean,
  installment_label: optional(nullable(pipe(string(), maxLength(100)))),
  starting_occurrence_number: optional(coercedInteger('Starting occurrence number', 1)),
  description: optional(nullable(pipe(string(), maxLength(500)))),
});

export const confirmOccurrenceAPISchema = strictObject({
  amount: amountValidation,
  transaction_date: dateStringValidation,
  category_id: requiredId('Category ID is required'),
  account_id: requiredId('Account ID is required'),
});

export const occurrenceStatusSchema = recurringOccurrenceStatusEnum;

export type CreateRecurringTemplateInput = InferInput<typeof createRecurringTemplateSchema>;
export type UpdateRecurringTemplateInput = InferInput<typeof updateRecurringTemplateSchema>;
export type ConfirmOccurrenceInput = InferInput<typeof confirmOccurrenceSchema>;
export type SkipOccurrenceInput = InferInput<typeof skipOccurrenceSchema>;

export type CreateRecurringTemplateAPIInput = InferOutput<typeof createRecurringTemplateAPISchema>;
export type UpdateRecurringTemplateAPIInput = InferOutput<typeof updateRecurringTemplateAPISchema>;
export type ConfirmOccurrenceAPIInput = InferOutput<typeof confirmOccurrenceAPISchema>;
