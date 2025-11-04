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

type FilenameMode = "original" | "random"

type ProgressState = {
  loaded: number
  total: number
}

const FILENAME_MODE_OPTIONS: Array<{ value: FilenameMode; label: string; description: string }> = [
  {
    value: "original",
    label: "Original Filename",
    description: "Keep the uploaded file name and make links readable.",
  },
  {
    value: "random",
    label: "Random UUID",
    description: "Generate a unique name to hide the original filename.",
  },
]

const defaultOption: AutoDeleteOption = "never"
const defaultFilenameMode: FilenameMode = "random"

export function UploadForm() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [autoDelete, setAutoDelete] = useState<AutoDeleteOption>(defaultOption)
  const [filenameMode, setFilenameMode] = useState<FilenameMode>(defaultFilenameMode)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState | null>(null)

  const resetState = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setAutoDelete(defaultOption)
    setProgress(null)
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
    setProgress({ loaded: 0, total: file.size })

    try {
      const payload = await uploadWithProgress({
        file,
        autoDelete,
        filenameMode,
        onProgress: (update) => setProgress(update),
      })

      setResult(payload)
      formRef.current?.reset()
      setFile(null)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.")
    } finally {
      setIsUploading(false)
      setProgress(null)
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
            setProgress(null)
          }}
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
        />
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

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-700">Filename Mode</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {FILENAME_MODE_OPTIONS.map((option) => {
              const isActive = filenameMode === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilenameMode(option.value)}
                  disabled={isUploading}
                  className={`rounded-md border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-neutral-300 ${
                    isActive
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
                  } ${isUploading ? "opacity-80" : ""}`}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className={`mt-1 block text-xs ${isActive ? "text-neutral-200" : "text-neutral-500"}`}>
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>
          <input type="hidden" name="filenameMode" value={filenameMode} />
          <p className="text-xs text-neutral-500">
            {filenameMode === "original"
              ? "Keep the original name. If a duplicate exists, we'll add (2), (3), and so on automatically."
              : "Use a random UUID so the original filename stays private."}
          </p>
        </div>

        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
          {file ? (
            <div className="space-y-1">
              <p className="font-medium text-neutral-800">{file.name}</p>
              <p className="text-xs text-neutral-500">Size: {formatBytes(file.size)}</p>
              <p className="text-xs text-neutral-500">Type: {file.type || "Unknown"}</p>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">Select a file to see its name, size, and type.</p>
          )}
        </div>

        {progress ? (
          <div className="space-y-2 rounded-md border border-neutral-200 bg-white px-4 py-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-neutral-900 transition-[width] duration-150 ease-out"
                style={{ width: `${getProgressPercentage(progress)}%` }}
              />
            </div>
            <p className="text-xs font-medium text-neutral-600">{buildProgressLabel(progress)}</p>
          </div>
        ) : null}

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

type UploadOptions = {
  file: File
  autoDelete: AutoDeleteOption
  filenameMode: FilenameMode
  onProgress: (progress: ProgressState) => void
}

function uploadWithProgress({ file, autoDelete, filenameMode, onProgress }: UploadOptions): Promise<UploadResult> {
  return new Promise<UploadResult>((resolve, reject) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("autoDelete", autoDelete)
    formData.append("filenameMode", filenameMode)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/upload")
    xhr.responseType = "json"

    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable && event.total > 0 ? event.total : file.size
      onProgress({ loaded: event.loaded, total })
    }

    xhr.onload = () => {
      const { status } = xhr
      const responseData = xhr.response as unknown

      if (status >= 200 && status < 300) {
        if (isUploadResult(responseData)) {
          onProgress({ loaded: file.size, total: file.size })
          resolve(responseData)
          return
        }

        try {
          const parsed = JSON.parse(xhr.responseText || "{}") as unknown
          if (isUploadResult(parsed)) {
            onProgress({ loaded: file.size, total: file.size })
            resolve(parsed)
            return
          }
        } catch {
          // Fall through to rejection below if parsing fails.
        }

        reject(new Error("Upload succeeded but the server response was invalid."))
        return
      }

      const message =
        responseData && typeof responseData === "object" && responseData !== null && typeof (responseData as { error?: unknown }).error === "string"
          ? (responseData as { error: string }).error
          : xhr.statusText || "Upload failed."
      reject(new Error(message))
    }

    xhr.onerror = () => {
      reject(new Error("Network error while uploading."))
    }

    xhr.send(formData)
  })
}

function getProgressPercentage(progress: ProgressState): number {
  if (progress.total <= 0) {
    return progress.loaded > 0 ? 100 : 0
  }

  const ratio = progress.loaded / progress.total
  return Math.min(100, Math.max(0, Math.round(ratio * 100)))
}

function buildProgressLabel(progress: ProgressState): string {
  const total = progress.total > 0 ? progress.total : progress.loaded
  const percentage = getProgressPercentage({ loaded: progress.loaded, total: total || progress.loaded || 1 })
  const totalLabel = total > 0 ? formatBytes(total) : formatBytes(progress.loaded)
  return `Uploading... ${formatBytes(progress.loaded)} / ${totalLabel} (${percentage}%)`
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const formatted = unitIndex === 0 ? Math.round(value).toString() : value < 10 ? value.toFixed(1) : value.toFixed(0)
  return `${formatted} ${units[unitIndex]}`
}

function isUploadResult(value: unknown): value is UploadResult {
  if (!value || typeof value !== "object") return false

  const candidate = value as Partial<UploadResult>
  return (
    typeof candidate.key === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.sharePath === "string" &&
    (candidate.expiresAt === null || typeof candidate.expiresAt === "string") &&
    typeof candidate.expiryOption === "string"
  )
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
