# OpenAPI Specification Structure

This directory contains the modular OpenAPI 3.1.0 specification for the Expenses API.

## Directory Structure

```
openapi/
├── README.md                        # This file
├── paths/                           # API endpoint definitions organized by feature
│   ├── auth.yml                     # Authentication endpoints (signup, login, logout)
│   ├── user.yml                     # User profile and settings endpoints
│   ├── user-meta.yml                # User meta/preferences endpoints
│   ├── workspace.yml                # Workspace management endpoints (settings, members, invitations)
│   ├── transactions.yml             # Transaction endpoints (CRUD, import, export)
│   ├── categories.yml               # Category management endpoints
│   ├── account-categories.yml         # Account category endpoints
│   ├── accounts.yml                   # Account tracking endpoints
│   ├── budget.yml                   # Budget overview and alerts endpoints
│   ├── budgets.yml                  # Budget CRUD endpoints
│   ├── forecast.yml                 # Forecast endpoints
│   ├── reports.yml                  # Reports endpoints
│   └── admin-diagnostics.yml        # Admin diagnostics endpoint
├── schemas/                         # Reusable data model definitions
│   ├── ApiErrorResponse.yml         # Base API response schema
│   ├── ErrorResponse.yml            # Error response schema
│   ├── SignupRequest.yml            # Registration request schema
│   ├── LoginRequest.yml             # Login request schema
│   ├── AuthSuccessResponse.yml      # Authentication success response
│   ├── UpdateUserProfileRequest.yml # Profile update request
│   ├── UserProfileResponse.yml      # Profile response
│   ├── UpdatePasswordRequest.yml    # Password change request
│   ├── PasswordUpdateResponse.yml   # Password update response
│   │
│   │ # Workspace schemas
│   ├── Workspace.yml                # Workspace object
│   ├── WorkspaceSettings.yml        # Workspace settings object
│   ├── WorkspaceSettingsResponse.yml # Workspace settings response
│   ├── UpdateWorkspaceSettingsRequest.yml # Workspace settings update request
│   ├── WorkspaceMember.yml          # Workspace member object
│   ├── WorkspaceMembersResponse.yml # Workspace members list response
│   ├── WorkspaceMemberDeleteResponse.yml # Member removal response
│   ├── WorkspaceInvitation.yml      # Workspace invitation object
│   ├── CreateWorkspaceInvitationRequest.yml # Invitation creation request
│   ├── WorkspaceInvitationResponse.yml # Single invitation response
│   ├── WorkspaceInvitationsListResponse.yml # Invitations list response
│   ├── WorkspaceInvitationDeleteResponse.yml # Invitation cancellation response
│   │
│   │ # Transaction schemas
│   ├── Transaction.yml              # Transaction object
│   ├── CreateTransactionRequest.yml # Transaction creation request
│   ├── UpdateTransactionRequest.yml # Transaction update request
│   ├── TransactionResponse.yml      # Transaction response
│   ├── TransactionsListResponse.yml # Transaction list response
│   ├── TransactionImportResult.yml  # Import result schema
│   │
│   │ # Category schemas
│   ├── Category.yml                 # Category object
│   ├── CreateCategoryRequest.yml    # Category creation request
│   ├── UpdateCategoryRequest.yml    # Category update request
│   ├── CategoryResponse.yml         # Category response
│   ├── CategoriesListResponse.yml   # Category list response
│   │
│   │ # Account schemas
│   ├── Account.yml                    # Account object
│   ├── CreateAccountRequest.yml       # Account creation request
│   ├── UpdateAccountRequest.yml       # Account update request
│   ├── UpdateAccountBalanceRequest.yml # Balance update request
│   ├── AccountResponse.yml            # Account response
│   ├── AccountsListResponse.yml       # Account list response
│   ├── AccountHistoryItem.yml         # Account history item
│   ├── AccountHistoryListResponse.yml # Account history list response
│   ├── AccountSummaryResponse.yml     # Account summary response
│   │
│   │ # Budget schemas
│   ├── BudgetOverviewResponse.yml   # Budget overview response
│   ├── BudgetAlertsResponse.yml     # Budget alerts response
│   ├── CategoryRemainingResponse.yml # Category remaining budget response
│   ├── BudgetHistoryResponse.yml    # Budget history response
│   └── ... (other budget schemas)
│   │
│   │ # Admin schemas
│   ├── RuntimeInfo.yml             # Runtime environment information
│   ├── DatabaseInfo.yml            # Database connection information
│   ├── CacheInfo.yml               # Cache driver information
│   ├── EnvironmentVariable.yml     # Environment variable (sanitized)
│   ├── ConfigurationValidation.yml  # Configuration validation results
│   └── DiagnosticsResponse.yml    # Admin diagnostics response
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
