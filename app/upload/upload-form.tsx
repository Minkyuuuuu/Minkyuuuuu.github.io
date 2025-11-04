"use client"

import { useRef, useState, type ReactNode } from "react"
import { AUTO_DELETE_OPTIONS, type AutoDeleteOption } from "@/lib/auto-delete"

type UploadResult = {
  key: string
  url: string
  sharePath: string
  expiresAt: string | null
  expiryOption: AutoDeleteOption
}

const defaultOption: AutoDeleteOption = "never"

export function UploadForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [autoDelete, setAutoDelete] = useState<AutoDeleteOption>(defaultOption)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetState = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setAutoDelete(defaultOption)
    formRef.current?.reset()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!file) {
      setError("Please choose a file before uploading.")
      return
    }

    setIsUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("autoDelete", autoDelete)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const message = await extractErrorMessage(response)
        throw new Error(message)
      }

      const payload = (await response.json()) as UploadResult
      setResult(payload)
      formRef.current?.reset()
      setFile(null)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.")
    } finally {
      setIsUploading(false)
    }
  }

  const shareUrl = result ? buildShareUrl(result.sharePath) : ""

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-lg border border-neutral-200 bg-white/80 p-8 shadow-sm backdrop-blur">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Secure File Upload</h1>
        <p className="mt-2 text-sm text-neutral-500">Upload files directly to your S3 bucket and get a shareable link.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="file" className="text-sm font-medium text-neutral-700">
          File
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          onChange={(event) => {
            const selectedFile = event.currentTarget.files?.item(0) ?? null
            setFile(selectedFile)
            setResult(null)
            setError(null)
          }}
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
        />
        {file ? <p className="text-xs text-neutral-500">Selected: {file.name}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="autoDelete" className="text-sm font-medium text-neutral-700">
          Auto-Delete
        </label>
        <select
          id="autoDelete"
          name="autoDelete"
          value={autoDelete}
          onChange={(event) => setAutoDelete(event.target.value as AutoDeleteOption)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
        >
          {AUTO_DELETE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
        <button
          type="button"
          onClick={resetState}
          disabled={isUploading}
          className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-75"
        >
          Reset
        </button>
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {result ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium">Upload successful!</p>
          <ShareLink label="Direct S3 URL" href={result.url}>
            {result.url}
          </ShareLink>
          <ShareLink label="Shareable link" href={shareUrl}>
            {shareUrl}
          </ShareLink>
          <p className="mt-1 text-xs text-emerald-700">
            {result.expiresAt ? `Auto-delete on ${formatDateTime(result.expiresAt)}.` : "Auto-delete disabled (never expires)."}
          </p>
        </div>
      ) : null}
    </form>
  )
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.error === "string") {
      return data.error
    }
  } catch (error) {
    console.warn("Failed to parse error response", error)
  }

  return response.statusText || "Upload failed"
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function buildShareUrl(sharePath: string): string {
  const encoded = encodeURIComponent(sharePath)
  if (typeof window === "undefined") {
    return `/files/${encoded}`
  }

  return `${window.location.origin}/files/${encoded}`
}

type ShareLinkProps = {
  label: string
  href: string
  children: ReactNode
}

function ShareLink({ label, href, children }: ShareLinkProps) {
  return (
    <p className="mt-2 break-all">
      <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}:</span>
      <a href={href} target="_blank" rel="noreferrer" className="underline">
        {children}
      </a>
    </p>
  )
}
