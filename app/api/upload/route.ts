import { NextResponse, type NextRequest } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { randomUUID } from "crypto"
import { extname } from "path"
import { computeExpiry, isAutoDeleteOption, type AutoDeleteOption } from "@/lib/auto-delete"
import { FILES_PREFIX, getPublicFileUrl, getS3Client, getS3Config } from "@/lib/s3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type UploadResponse = {
  key: string
  url: string
  sharePath: string
  expiresAt: string | null
  expiryOption: AutoDeleteOption
}

const MAX_FILENAME_LENGTH = 200

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const autoDeleteRaw = formData.get("autoDelete")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 })
    }

    if (!isAutoDeleteOption(autoDeleteRaw)) {
      return NextResponse.json({ error: "Invalid auto-delete option." }, { status: 400 })
    }

    const autoDeleteOption: AutoDeleteOption = autoDeleteRaw

    const timestamp = Date.now()
    const extension = extractExtension(file.name)
    const key = `${FILES_PREFIX}${timestamp}-${randomUUID()}${extension}`

    const sharePath = key.slice(FILES_PREFIX.length)
    const now = new Date()
    const expiresAtDate = computeExpiry(autoDeleteOption, now)

    const arrayBuffer = await file.arrayBuffer()

    const s3Client = getS3Client()
    const { bucket } = getS3Config()

    const putObject = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type || "application/octet-stream",
      Metadata: {
        "uploaded-at": now.toISOString(),
        "expiry-option": autoDeleteOption,
        "expires-at": expiresAtDate ? expiresAtDate.toISOString() : "never",
        "original-filename": sanitizeFilename(file.name),
      },
    })

    await s3Client.send(putObject)

    const payload: UploadResponse = {
      key,
      url: getPublicFileUrl(key),
      sharePath,
      expiresAt: expiresAtDate ? expiresAtDate.toISOString() : null,
      expiryOption: autoDeleteOption,
    }

    return NextResponse.json(payload, { status: 201 })
  } catch (error) {
    console.error("Upload failed", error)
    return NextResponse.json({ error: "Failed to upload file." }, { status: 500 })
  }
}

function extractExtension(filename: string): string {
  const extension = extname(filename.trim())
  if (!extension) return ""
  return extension.toLowerCase()
}

function sanitizeFilename(filename: string): string {
  if (!filename) return "unknown"

  const normalized = filename.trim().replace(/[\r\n]/g, " ")
  if (normalized.length <= MAX_FILENAME_LENGTH) {
    return normalized
  }

  const extension = extname(normalized)
  const limit = Math.max(0, MAX_FILENAME_LENGTH - extension.length - 3)
  const base = normalized.slice(0, limit)
  return `${base}...${extension}`
}
