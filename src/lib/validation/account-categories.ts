import {
  boolean,
  integer,
  maxLength,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  string,
  transform,
  trim,
  type InferOutput,
} from 'valibot';

const requiredId = (message: string) => pipe(string(), minLength(1, message));

const nameValidation = pipe(
  string(),
  trim(),
  minLength(1, 'Category name is required'),
  maxLength(100, 'Category name must not exceed 100 characters')
);

const descriptionValidation = pipe(
  optional(
    nullable(pipe(string(), trim(), maxLength(500, 'Description must not exceed 500 characters'))),
    null
  ),
  transform((value) => (value && value.length > 0 ? value : null))
);

// Update variant: preserves undefined when field is absent so the service's
// `!== undefined` guard correctly skips unset fields
const descriptionUpdateValidation = optional(
  pipe(
    nullable(pipe(string(), trim(), maxLength(500, 'Description must not exceed 500 characters'))),
    transform((value) => (value && value.length > 0 ? value : null))
  )
);

const sortOrderValidation = pipe(
  number(),
  integer('Sort order must be an integer'),
  minValue(0, 'Sort order must be 0 or greater')
);

export const createAccountCategorySchema = object({
  workspace_id: requiredId('Workspace ID is required'),
  created_by_user_id: requiredId('Created by user ID is required'),
  name: nameValidation,
  description: descriptionValidation,
  is_liability: boolean(),
  is_system: optional(boolean(), false),
  sort_order: optional(sortOrderValidation, 0),
});

export type CreateAccountCategoryInput = InferOutput<typeof createAccountCategorySchema>;

export const updateAccountCategorySchema = object({
  name: optional(nameValidation),
  description: descriptionUpdateValidation,
  is_liability: optional(boolean()),
  sort_order: optional(sortOrderValidation),
});

export type UpdateAccountCategoryInput = InferOutput<typeof updateAccountCategorySchema>;

export const createAccountCategoryAPISchema = object({
  name: nameValidation,
  description: descriptionValidation,
  isLiability: boolean(),
});

export const updateAccountCategoryAPISchema = object({
  name: optional(nameValidation),
  description: descriptionUpdateValidation,
  isLiability: optional(boolean()),
});

export const accountCategoryFilterSchema = object({
  isLiability: optional(boolean()),
  isSystem: optional(boolean()),
});

export type AccountCategoryFilter = InferOutput<typeof accountCategoryFilterSchema>;
