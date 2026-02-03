# Versioning Design

## Overview

Add semver versioning to the application with version display in sidebar and a local release script for creating GitHub releases.

## Requirements

1. Display version in sidebar below the logo as a subtle badge
2. Use semver starting at `0.1.0`
3. Source version from `package.json`
4. Local release script that bumps version, tags, and creates GitHub release with auto-generated notes

## Implementation

### 1. Update `package.json`

Add version field:

```json
{
  "name": "allowealth",
  "version": "0.1.0",
  ...
}
```

Add release script:

```json
{
  "scripts": {
    "release": "bun run scripts/release.ts"
  }
}
```

### 2. Version Helper (`src/lib/version.ts`)

```typescript
import packageJson from '../../package.json';
export const APP_VERSION = packageJson.version;
```

### 3. Update `Navigation.astro`

Add version badge below the logo block (desktop only, hidden when collapsed):

```astro
import {APP_VERSION} from '@/lib/version';

<!-- In the brand logo section, after the logo link -->
<span class="text-xs text-base-content/40 mt-1 group-data-[sidebar-collapsed=true]:hidden">
  v{APP_VERSION}
</span>
```

### 4. Release Script (`scripts/release.ts`)

Interactive Bun script with the following flow:

1. **Check prerequisites**
   - Verify `gh` CLI is installed and authenticated
   - Verify working directory is clean (no uncommitted changes)
   - Verify on `main` branch

2. **Prompt for bump type**
   - Display current version
   - Ask: patch, minor, or major

3. **Calculate new version**
   - Parse current version
   - Apply semver bump

4. **Update `package.json`**
   - Write new version to file

5. **Commit and tag**
   - `git add package.json`
   - `git commit -m "chore: release vX.Y.Z"`
   - `git tag vX.Y.Z`

6. **Push to remote**
   - `git push`
   - `git push --tags`

7. **Create GitHub Release**
   - `gh release create vX.Y.Z --generate-notes`
   - The `--generate-notes` flag auto-generates changelog from merged PRs since last tag

### Prerequisites

- `gh` CLI installed and authenticated (`gh auth login`)
- Clean git working directory
- On `main` branch

## Files to Create/Modify

| File                                      | Action                                   |
| ----------------------------------------- | ---------------------------------------- |
| `package.json`                            | Add `version` field and `release` script |
| `src/lib/version.ts`                      | Create - exports APP_VERSION             |
| `src/components/layouts/Navigation.astro` | Modify - add version badge               |
| `scripts/release.ts`                      | Create - release automation script       |

## Testing

1. Run `bun run release` in a test environment
2. Verify version badge appears in sidebar
3. Verify GitHub release is created with auto-generated notes
