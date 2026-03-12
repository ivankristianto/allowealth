# Allowealth Docs Screenshots Guide

## Image Hosting

All screenshots and images used in the documentation **must** be hosted on Cloudflare R2 bucket (`allowealth-docs-screenshots`).

### Base URL

The base URL for all images is: `https://images.allowealth.io/`

### Uploading Images

When adding a new image to the documentation:

1. Capture the image locally.
2. Navigate to the `apps/docs` directory.
3. Upload the image to R2 using wrangler:
   ```bash
   bunx wrangler r2 object put "allowealth-docs-screenshots/<filename>" --file "<path-to-local-file>" --remote
   ```
4. Delete the local image file to prevent repository bloat.
5. Reference the image in the Markdown file using the remote URL: `![Description](https://images.allowealth.io/<filename>)`

**Do not** store screenshots permanently in the `apps/docs/public/images/` folder or commit them to source control.
