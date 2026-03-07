---
name: cloudflare-r2-uploader
description: Upload local image files to a Cloudflare R2 bucket and update associated Markdown files with their new public URLs. Use when you need to migrate local images to R2 and update documentation links.
---

# Cloudflare R2 Uploader Skill

This skill is designed to help users upload local images to a Cloudflare R2 bucket and update their Markdown documentation to reference the new public URLs instead of local file paths.

## Inputs Provided by User

When activating this skill, ensure you have the following context from the user. If any are missing or ambiguous, ask for clarification:

1. **Source Images Folder:** The directory containing the local images to be uploaded.
2. **Markdown Files:** The specific Markdown file(s) or directory of files that need their image URLs updated.
3. **R2 Details:** The Cloudflare R2 bucket name, the destination path/prefix within the bucket, and the public URL domain corresponding to the bucket.

## Execution Steps

### 1. Verification & Strategy

- Verify the `Source Images Folder` and the `Markdown Files` exist in the local filesystem.
- List the images in the source folder to determine the scope of work.

### 2. File Upload

- Upload the files from the source images folder to the specified Cloudflare R2 bucket.
- **Suggested Tools:** Use `run_shell_command` with an available CLI tool in the environment. For example:
  - Wrangler CLI: `wrangler r2 object put <bucket_name>/<destination_path>/<filename> --file <local_path>`
  - AWS CLI (if configured for R2): `aws s3 cp <local_path> s3://<bucket_name>/<destination_path>/<filename> --endpoint-url <cloudflare_r2_endpoint>`
- Wait for all uploads to complete and ensure they are successful before proceeding.

### 3. Update Markdown Files

- For each uploaded image, construct its new public URL: `https://<public_domain>/<destination_path>/<filename>`.
- Search the provided `Markdown Files` for the old local paths of the uploaded images (e.g., using `grep_search`).
- Update the Markdown files to replace the local paths with the new R2 public URLs. You can use the `replace` tool, `sed` in `run_shell_command`, or write a small Node/Python script if there are many replacements.
- _Ensure the updated paths correctly resolve and the Markdown syntax (`![alt text](url)`) remains valid._

### 4. Finalization

- **CRITICAL:** Do NOT delete, move, or modify the local source images folder after uploading. Leave the local image files exactly as they are. It is up to the user to decide what to do with them.
- Output a concise summary of the operation:
  - List of files uploaded.
  - List of Markdown files updated.
  - Confirmation that the local images were left untouched.
