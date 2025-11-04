import type { Metadata } from "next"
import { UploadForm } from "./upload-form"

export const metadata: Metadata = {
  title: "Secure Upload",
  description: "Upload files privately to S3",
}

export default function UploadPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-10">
      <UploadForm />
    </main>
  )
}
