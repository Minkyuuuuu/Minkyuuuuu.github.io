## Secure File Uploads

This Next.js application exposes a password-protected upload flow that sends files to the `minkyuu` S3 bucket and generates public share links. Uploaded files include auto-delete metadata so they can be purged automatically via the `/api/cleanup` endpoint.

### Environment Variables

Copy `.env.example` to `.env.local` (not committed) and fill in the values for your AWS account. The provided defaults match the requested credentials and bucket name.

```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=
UPLOAD_USERNAME=
UPLOAD_PASSWORD=
```

### Development

- Install dependencies with `pnpm install`.
- Run locally with `pnpm dev` and visit `http://localhost:3000/upload`.
- When prompted for credentials use the values from `UPLOAD_USERNAME` and `UPLOAD_PASSWORD`.

### Endpoints

- `GET /upload` – password-protected page with file picker and auto-delete options.
- `POST /api/upload` – accepts multipart form uploads; stores the file under `files/` in S3 with metadata (`uploaded-at`, `expires-at`, `expiry-option`, `original-filename`). Returns both the direct S3 URL and the shareable `/files/{filename}` path.
- `GET /files/{filename}` – public route that validates the object exists and redirects to the S3 URL (works for Discord embeds).
- `GET|POST /api/cleanup` – scans the `files/` prefix and deletes objects whose `expires-at` time has passed. Protect this endpoint behind the same Basic Auth credentials (already enforced via middleware) and schedule it with a Vercel Cron job if desired.

### Notes

- Ensure the `minkyuu` S3 bucket allows public reads for the `files/` prefix (either via bucket policy or object ACLs) so returned URLs remain accessible.
- Uploaded objects are tagged with `expires-at="never"` when no auto-delete option is selected; cleanup skips those files.
- The project uses Tailwind utility classes for a lightweight, minimal UI.
