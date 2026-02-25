import { z } from 'zod';
import {
  currencyEnum,
  recurringTemplateStatusEnum,
  recurringOccurrenceStatusEnum,
  categoryTypeEnum,
} from '@/lib/enums';

const dateStringValidation = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date');

const amountValidation = z
  .string()
  .min(1, 'Amount is required')
  .refine(
    (value) => {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) && parsed > 0;
    },
    { message: 'Amount must be greater than 0' }
  );

const baseRecurringTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must not exceed 200 characters'),
  type: categoryTypeEnum,
  amount: amountValidation,
  currency: currencyEnum,
  category_id: z.string().min(1, 'Category is required'),
  account_id: z.string().min(1, 'Account is required'),
  day_of_month: z.number().int().min(1).max(31),
  start_date: dateStringValidation,
  end_date: dateStringValidation.optional(),
  total_occurrences: z.number().int().min(1).optional(),
  is_installment: z.boolean().default(false),
  installment_label: z.string().max(100).optional(),
  starting_occurrence_number: z.number().int().min(1).default(1),
  description: z.string().max(500).optional(),
  status: recurringTemplateStatusEnum.default('active'),
});

function refineRecurringTemplate<T extends z.ZodTypeAny>(schema: T): T {
  return schema
    .refine((data: any) => Boolean(data.total_occurrences || data.end_date), {
      message: 'At least one end condition is required',
      path: ['total_occurrences'],
    })
    .refine((data: any) => !data.is_installment || Boolean(data.total_occurrences), {
      message: 'Installments require total occurrences',
      path: ['total_occurrences'],
    })
    .refine(
      (data: any) =>
        data.total_occurrences === undefined ||
        data.starting_occurrence_number <= data.total_occurrences,
      {
        message: 'Starting occurrence number must be less than or equal to total occurrences',
        path: ['starting_occurrence_number'],
      }
    ) as T;
}

// Service layer schemas
export const createRecurringTemplateSchema = refineRecurringTemplate(
  baseRecurringTemplateSchema.extend({
    workspace_id: z.string().min(1, 'Workspace ID is required'),
    created_by_user_id: z.string().min(1, 'Created by user ID is required'),
  })
).strict();

export const updateRecurringTemplateSchema = z
  .object({
    workspace_id: z.string().min(1, 'Workspace ID is required'),
    name: z.string().min(1).max(200).optional(),
    type: categoryTypeEnum.optional(),
    amount: amountValidation.optional(),
    currency: currencyEnum.optional(),
    category_id: z.string().min(1).optional(),
    account_id: z.string().min(1).optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
    start_date: dateStringValidation.optional(),
    end_date: dateStringValidation.optional(),
    total_occurrences: z.number().int().min(1).optional(),
    is_installment: z.boolean().optional(),
    installment_label: z.string().max(100).optional(),
    starting_occurrence_number: z.number().int().min(1).optional(),
    description: z.string().max(500).optional(),
    status: recurringTemplateStatusEnum.optional(),
  })
  .strict();

export const confirmOccurrenceSchema = z
  .object({
    amount: amountValidation,
    transaction_date: z.date(),
    category_id: z.string().min(1, 'Category ID is required'),
    account_id: z.string().min(1, 'Account ID is required'),
    workspace_id: z.string().min(1, 'Workspace ID is required'),
    user_id: z.string().min(1, 'User ID is required'),
  })
  .strict();

export const skipOccurrenceSchema = z
  .object({
    skip_reason: z.string().max(200, 'Skip reason must not exceed 200 characters').optional(),
  })
  .strict();

// API layer schemas
export const createRecurringTemplateAPISchema = refineRecurringTemplate(
  z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name must not exceed 200 characters'),
    type: categoryTypeEnum,
    amount: amountValidation,
    currency: currencyEnum,
    category_id: z.string().min(1, 'Category is required'),
    account_id: z.string().min(1, 'Account is required'),
    day_of_month: z.coerce.number().int().min(1).max(31),
    start_date: dateStringValidation,
    end_date: dateStringValidation.optional(),
    total_occurrences: z.coerce.number().int().min(1).optional(),
    is_installment: z.coerce.boolean().default(false),
    installment_label: z.string().max(100).optional(),
    starting_occurrence_number: z.coerce.number().int().min(1).default(1),
    description: z.string().max(500).optional(),
    status: recurringTemplateStatusEnum.default('active'),
  })
).strict();

export const updateRecurringTemplateAPISchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    type: categoryTypeEnum.optional(),
    amount: amountValidation.optional(),
    currency: currencyEnum.optional(),
    category_id: z.string().min(1).optional(),
    account_id: z.string().min(1).optional(),
    day_of_month: z.coerce.number().int().min(1).max(31).optional(),
    start_date: dateStringValidation.optional(),
    end_date: dateStringValidation.optional(),
    total_occurrences: z.coerce.number().int().min(1).optional(),
    is_installment: z.coerce.boolean().optional(),
    installment_label: z.string().max(100).optional(),
    starting_occurrence_number: z.coerce.number().int().min(1).optional(),
    description: z.string().max(500).optional(),
    status: recurringTemplateStatusEnum.optional(),
  })
  .strict();

export const confirmOccurrenceAPISchema = z
  .object({
    amount: amountValidation,
    transaction_date: dateStringValidation,
    category_id: z.string().min(1, 'Category ID is required'),
    account_id: z.string().min(1, 'Account ID is required'),
  })
  .strict();

export const occurrenceStatusSchema = recurringOccurrenceStatusEnum;

export type CreateRecurringTemplateInput = z.input<typeof createRecurringTemplateSchema>;
export type UpdateRecurringTemplateInput = z.input<typeof updateRecurringTemplateSchema>;
export type ConfirmOccurrenceInput = z.input<typeof confirmOccurrenceSchema>;
export type SkipOccurrenceInput = z.input<typeof skipOccurrenceSchema>;

export type CreateRecurringTemplateAPIInput = z.input<typeof createRecurringTemplateAPISchema>;
export type UpdateRecurringTemplateAPIInput = z.input<typeof updateRecurringTemplateAPISchema>;
export type ConfirmOccurrenceAPIInput = z.input<typeof confirmOccurrenceAPISchema>;
