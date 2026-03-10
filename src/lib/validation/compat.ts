import {
  parse as parseValue,
  safeParse as safeParseValue,
  type BaseIssue,
  type BaseSchema,
  type InferInput,
  type InferIssue,
  type InferOutput,
} from 'valibot';

type SafeParseFailure<TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>> = {
  success: false;
  error: {
    issues: [InferIssue<TSchema>, ...InferIssue<TSchema>[]];
  };
};

type SafeParseSuccess<TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>> = {
  success: true;
  data: InferOutput<TSchema>;
};

export type SchemaWithCompat<TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>> =
  TSchema & {
    parse: (input: InferInput<TSchema>) => InferOutput<TSchema>;
    safeParse: (
      input: InferInput<TSchema>
    ) => SafeParseSuccess<TSchema> | SafeParseFailure<TSchema>;
  };

export function withSchemaCompat<TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
  schema: TSchema
): SchemaWithCompat<TSchema> {
  return Object.assign(schema, {
    parse(input: InferInput<TSchema>) {
      return parseValue(schema, input);
    },
    safeParse(input: InferInput<TSchema>) {
      const result = safeParseValue(schema, input);

      if (result.success) {
        return {
          success: true,
          data: result.output,
        } as SafeParseSuccess<TSchema>;
      }

      return {
        success: false,
        error: {
          issues: result.issues,
        },
      } as SafeParseFailure<TSchema>;
    },
  }) as SchemaWithCompat<TSchema>;
}
