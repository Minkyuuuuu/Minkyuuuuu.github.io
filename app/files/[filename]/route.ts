import { NextResponse, type NextRequest } from "next/server"
import { HeadObjectCommand } from "@aws-sdk/client-s3"
import { FILES_PREFIX, getPublicFileUrl, getS3Client, getS3Config } from "@/lib/s3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: {
    filename: string
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const rawFilename = context.params.filename
  const filename = decodeURIComponent(rawFilename)

  if (filename.includes("/")) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 })
  }

  const key = `${FILES_PREFIX}${filename}`

  const s3Client = getS3Client()
  const { bucket } = getS3Config()

  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: "File not found." }, { status: 404 })
    }

    console.error(`Failed to load metadata for ${key}`, error)
    return NextResponse.json({ error: "Failed to retrieve file." }, { status: 500 })
  }

  const publicUrl = getPublicFileUrl(key)
  return NextResponse.redirect(publicUrl, { status: 302 })
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false

  const serviceError = error as { name?: string; $metadata?: { httpStatusCode?: number } }
  if (serviceError.$metadata?.httpStatusCode === 404) return true

  const name = serviceError.name?.toLowerCase()
  return name === "nosuchkey" || name === "notfound"
}
