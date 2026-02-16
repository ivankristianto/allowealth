# Learned Patterns

Patterns learned from experience during development. When a pattern clearly belongs to a domain, it is moved to the appropriate rule file.

## Where Patterns Live

| Domain                                        | File                        |
| --------------------------------------------- | --------------------------- |
| Astro components, Vite SSR, client scripts    | `frontend/astro.md`         |
| Bundle size, imports, tree-shaking            | `frontend/bundle.md`        |
| Design system, DaisyUI, accessibility         | `frontend/design-system.md` |
| Database, ORM, queries, input validation      | `backend/database.md`       |
| Cloudflare Workers, Wrangler, D1, env vars    | `backend/deployment.md`     |
| API patterns, OpenAPI                         | `backend/api.md`            |
| Testing, Playwright, E2E, test data           | `testing.md`                |
| Debugging, feature completeness, subprocesses | `workflow.md`               |

## Adding New Patterns

When you learn a new pattern from a debugging session or code review:

1. Identify which domain file it belongs to
2. Add it directly to that file with ✅/❌ format
3. Only add here if it doesn't fit any domain file

Patterns added here should be periodically redistributed to domain files.
