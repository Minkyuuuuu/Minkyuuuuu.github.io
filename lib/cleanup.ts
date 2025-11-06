import { DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { FILES_PREFIX, getS3Client, getS3Config } from "@/lib/s3"

export type CleanupAction = "deleted" | "skipped" | "error"

export type CleanupResult = {
  key: string
  action: CleanupAction
  expiresAt: string | null
  reason?: string
}

export type CleanupSummary = {
  deleted: number
  skipped: number
  errors: number
}

export type CleanupPayload = {
  summary: CleanupSummary
  results: CleanupResult[]
}

export async function performCleanup(now = new Date()): Promise<CleanupPayload> {
  const s3Client = getS3Client()
  const { bucket } = getS3Config()
  const results: CleanupResult[] = []

  let continuationToken: string | undefined

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: FILES_PREFIX,
      ContinuationToken: continuationToken,
    })

    const listResponse = await s3Client.send(listCommand)
    const objects = listResponse.Contents ?? []

    for (const object of objects) {
      const key = object.Key
      if (!key) continue

      try {
        const headResponse = await s3Client.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        )

        const metadata = headResponse.Metadata ?? {}
        const expiresAtRaw = metadata["expires-at"] ?? metadata["expires_at"]

        if (!expiresAtRaw || expiresAtRaw === "never") {
          results.push({ key, action: "skipped", expiresAt: null, reason: "no-expiry" })
          continue
        }

        const expiresAtDate = new Date(expiresAtRaw)
        if (Number.isNaN(expiresAtDate.getTime())) {
          results.push({ key, action: "error", expiresAt: null, reason: "invalid-expiry" })
          continue
        }

        if (expiresAtDate <= now) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: key,
            }),
          )

          results.push({ key, action: "deleted", expiresAt: expiresAtDate.toISOString() })
        } else {
          results.push({ key, action: "skipped", expiresAt: expiresAtDate.toISOString(), reason: "not-expired" })
        }
      } catch (error) {
        console.error(`Failed to evaluate ${key}`, error)
        results.push({ key, action: "error", expiresAt: null, reason: "head-or-delete-failed" })
      }
    }

    continuationToken = listResponse.NextContinuationToken
  } while (continuationToken)

  const summary: CleanupSummary = {
    deleted: results.filter((result) => result.action === "deleted").length,
    skipped: results.filter((result) => result.action === "skipped").length,
    errors: results.filter((result) => result.action === "error").length,
  }

  return { summary, results }
}
