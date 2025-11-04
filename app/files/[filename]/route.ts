import { NextResponse, type NextRequest } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { Readable } from "node:stream"
import { FILES_PREFIX, getS3Client, getS3Config } from "@/lib/s3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, context: { params: Promise<{ filename: string }> }) {
  const params = await context.params
  const rawFilename = params.filename
  const filename = decodeURIComponent(rawFilename)

  if (!isValidFilename(filename)) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 })
  }

  const key = `${FILES_PREFIX}${filename}`
  const s3Client = getS3Client()
  const { bucket } = getS3Config()

  try {
    const object = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )

    if (!object.Body) {
      console.error(`Missing body while streaming ${key}`)
      return NextResponse.json({ error: "File stream unavailable." }, { status: 500 })
    }

    const stream = toWebReadableStream(object.Body)
    const headers = new Headers()

    headers.set("Content-Type", object.ContentType || "application/octet-stream")
    if (object.ContentLength !== undefined) {
      headers.set("Content-Length", object.ContentLength.toString())
    }
    if (object.LastModified) {
      headers.set("Last-Modified", object.LastModified.toUTCString())
    }
    if (object.ETag) {
      headers.set("ETag", object.ETag)
    }
    if (object.CacheControl) {
      headers.set("Cache-Control", object.CacheControl)
    } else {
      headers.set("Cache-Control", "public, max-age=60")
    }
    if (object.ContentEncoding) {
      headers.set("Content-Encoding", object.ContentEncoding)
    }
    if (object.ContentLanguage) {
      headers.set("Content-Language", object.ContentLanguage)
    }

    const dispositionName = selectDispositionFilename(filename, object.Metadata)
    applyContentDisposition(headers, dispositionName)

    return new NextResponse(stream, {
      status: 200,
      headers,
    })
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json({ error: "File not found." }, { status: 404 })
    }

    console.error(`Failed to retrieve ${key}`, error)
    return NextResponse.json({ error: "Failed to retrieve file." }, { status: 500 })
  }
}

function toWebReadableStream(body: unknown): ReadableStream<Uint8Array> {
  if (!body) {
    throw new Error("Cannot create stream from empty body")
  }

  if (body instanceof Readable) {
    return Readable.toWeb(body)
  }

  const maybeReadable = body as { transformToWebStream?: () => ReadableStream<Uint8Array> }
  if (typeof maybeReadable?.transformToWebStream === "function") {
    return maybeReadable.transformToWebStream()
  }

  if (body instanceof ReadableStream) {
    return body
  }

  if (body instanceof Uint8Array) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(body)
        controller.close()
      },
    })
  }

  throw new Error("Unsupported S3 body stream type")
}

function isValidFilename(filename: string): boolean {
  if (!filename) return false
  if (filename.includes("/")) return false
  if (filename.includes("\\")) return false
  if (filename.includes("..")) return false
  return true
}

const MAX_DISPOSITION_LENGTH = 200

function selectDispositionFilename(requested: string, metadata?: Record<string, string>): string {
  const original = metadata?.["original-filename"]
  const candidate = original && original.trim() ? original : requested
  return sanitizeDispositionFilename(candidate)
}

function sanitizeDispositionFilename(value: string): string {
  const withoutControl = value.replace(/[\r\n]+/g, " ")
  const trimmed = withoutControl.trim()
  if (!trimmed) return "file"
  if (trimmed.length <= MAX_DISPOSITION_LENGTH) return trimmed
  return trimmed.slice(0, MAX_DISPOSITION_LENGTH)
}

function applyContentDisposition(headers: Headers, filename: string) {
  const asciiFallback = filename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]+/g, "_")
    .replace(/["\\]/g, "_")
  const encoded = encodeURIComponent(filename)
  headers.set("Content-Disposition", `inline; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`)
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false

  const serviceError = error as { name?: string; $metadata?: { httpStatusCode?: number } }
  if (serviceError.$metadata?.httpStatusCode === 404) return true

  const name = serviceError.name?.toLowerCase()
  return name === "nosuchkey" || name === "notfound"
}
