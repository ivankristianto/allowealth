# OpenAPI Specification

**Format:** OpenAPI 3.1.0 (modular, split across files)
**Location:** `openapi/`

## Rule: Update OpenAPI when changing API endpoints

When adding or modifying any API endpoint or response shape, update the corresponding files in `openapi/paths/` and `openapi/schemas/`. This is a blocking requirement before committing.

## Structure

```
openapi/
├── README.md            # Spec structure and maintenance guide
├── paths/               # Endpoint definitions (one file per feature domain)
│   ├── auth.yml         # Authentication endpoints
│   ├── user.yml         # User profile and settings
│   ├── workspace.yml    # Workspace management, members, invitations
│   ├── transactions.yml # Transactions CRUD, import, export
│   ├── categories.yml   # Category management
│   ├── account-categories.yml
│   ├── accounts.yml     # Account tracking
│   ├── budget.yml       # Budget overview and alerts
│   ├── budgets.yml      # Budget CRUD
│   ├── forecast.yml     # Forecast endpoints
│   ├── reports.yml      # Report endpoints
│   ├── recurring.yml    # Recurring templates and occurrences
│   ├── mfa.yml          # MFA endpoints
│   └── admin-diagnostics.yml
└── schemas/             # Reusable data model definitions
    ├── Transaction.yml, CreateTransactionRequest.yml, ...
    ├── Budget.yml, CreateBudgetRequest.yml, ...
    ├── Account.yml, CreateAccountRequest.yml, ...
    ├── Category.yml, CreateCategoryRequest.yml, ...
    ├── RecurringTemplate.yml, RecurringOccurrence.yml, ...
    ├── ErrorResponse.yml, ApiErrorResponse.yml
    └── ... (one schema per model)
```

## When to update

- New API endpoint → add to `paths/<domain>.yml`
- New response field → update `schemas/<Model>.yml`
- New request field → update `schemas/Create<Model>Request.yml` or `Update<Model>Request.yml`
- New DB column returned in API → schema MUST include it (easy to forget)
