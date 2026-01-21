# OpenAPI Specification Structure

This directory contains the modular OpenAPI 3.1.0 specification for the Expenses API.

## Directory Structure

```
openapi/
├── README.md                        # This file
├── paths/                           # API endpoint definitions organized by feature
│   ├── auth.yml                     # Authentication endpoints (signup, login, logout)
│   ├── user.yml                     # User profile and settings endpoints
│   ├── transactions.yml             # Transaction endpoints (CRUD, import, export)
│   ├── categories.yml               # Category management endpoints
│   ├── payment-methods.yml          # Payment method endpoints
│   ├── assets.yml                   # Asset tracking endpoints
│   └── budget.yml                   # Budget overview and alerts endpoints
├── schemas/                         # Reusable data model definitions
│   ├── ApiErrorResponse.yml         # Base API response schema
│   ├── ErrorResponse.yml            # Error response schema
│   ├── SignupRequest.yml            # Registration request schema
│   ├── LoginRequest.yml             # Login request schema
│   ├── AuthSuccessResponse.yml      # Authentication success response
│   ├── UpdateUserProfileRequest.yml # Profile update request
│   ├── UserProfileResponse.yml     # Profile response
│   ├── UpdatePasswordRequest.yml    # Password change request
│   ├── PasswordUpdateResponse.yml   # Password update response
│   ├── UpdateUserSettingsRequest.yml # Settings update request
│   ├── UserSettingsResponse.yml     # Settings response
│   ├── Transaction.yml              # Transaction object
│   ├── CreateTransactionRequest.yml # Transaction creation request
│   ├── UpdateTransactionRequest.yml # Transaction update request
│   ├── TransactionResponse.yml      # Transaction response
│   ├── TransactionsListResponse.yml # Transaction list response
│   ├── TransactionImportResult.yml  # Import result schema
│   ├── Category.yml                 # Category object
│   ├── CreateCategoryRequest.yml    # Category creation request
│   ├── UpdateCategoryRequest.yml    # Category update request
│   ├── CategoryResponse.yml         # Category response
│   ├── CategoriesListResponse.yml   # Category list response
│   ├── PaymentMethod.yml            # Payment method object
│   ├── CreatePaymentMethodRequest.yml # Payment method creation request
│   ├── UpdatePaymentMethodRequest.yml # Payment method update request
│   ├── PaymentMethodResponse.yml    # Payment method response
│   ├── PaymentMethodsListResponse.yml # Payment method list response
│   ├── Asset.yml                    # Asset object
│   ├── CreateAssetRequest.yml       # Asset creation request
│   ├── UpdateAssetRequest.yml       # Asset update request
│   ├── UpdateAssetBalanceRequest.yml # Balance update request
│   ├── AssetResponse.yml            # Asset response
│   ├── AssetsListResponse.yml       # Asset list response
│   ├── AssetHistoryItem.yml         # Asset history item
│   ├── AssetHistoryListResponse.yml # Asset history list response
│   ├── AssetSummaryResponse.yml     # Asset summary response
│   ├── BudgetOverviewResponse.yml   # Budget overview response
│   ├── BudgetAlertsResponse.yml     # Budget alerts response
│   ├── CategoryRemainingResponse.yml # Category remaining budget response
│   ├── BudgetHistoryResponse.yml    # Budget history response
│   ├── UpdateBudgetCategoryRequest.yml # Budget category update request
│   └── BudgetCategoryResponse.yml   # Budget category response
├── responses/                       # Reusable response definitions
│   └── common.yml                   # Common HTTP responses (400, 401, 404, 500)
└── parameters/                      # Reusable parameter definitions
    └── common.yml                   # Common parameters (id)
```

## Main Specification

The root `openapi.yml` file at the project root references these modular files using `$ref`.

## Adding New Endpoints

1. Create/update the appropriate file in `paths/`
2. Define reusable schemas in `schemas/` if needed
3. Reference from main `openapi.yml`
4. Validate with: `npx @redocly/cli lint openapi.yml`

## Viewing Documentation

Use Swagger UI or Redoc to view the compiled specification:

- Swagger UI: https://editor.swagger.io/ (paste main openapi.yml)
- Redoc: `npx @redocly/cli preview-docs openapi.yml`

## Best Practices

- Keep path files focused on a single feature domain
- Extract common schemas to avoid duplication
- Use relative paths for $ref (e.g., `../schemas/User.yml`)
- Add examples to all schemas and responses
- Document all parameters and request bodies

## JSON Pointer Escaping

When using `$ref` with paths that contain `/`, use `~1` to escape the forward slash:

- `/api/auth/login` becomes `~1api~1auth~1login`
- `/api/transactions/{id}` becomes `~1api~1transactions~1{id}`

## Validation Commands

```bash
# Install OpenAPI validation tool (if not already installed)
npm install -g @redocly/cli

# Validate the split OpenAPI specification
npx @redocly/cli lint openapi.yml

# Preview documentation locally
npx @redocly/cli preview-docs openapi.yml

# Bundle split files into single file (for distribution)
npx @redocly/cli bundle openapi.yml -o openapi.bundled.yml
```
