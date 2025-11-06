import { NextRequest, NextResponse } from "next/server"
import { performCleanup } from "@/lib/cleanup"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.warn("[cron] CRON_SECRET is not set. Allowing request by default.")
    return true
  }

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { summary, results } = await performCleanup()
    return NextResponse.json({ ok: true, summary, deleted: summary.deleted, results })
  } catch (error) {
    console.error("Scheduled cleanup failed", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
