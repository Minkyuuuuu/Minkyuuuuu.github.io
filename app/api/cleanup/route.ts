import { NextResponse } from "next/server"
import { performCleanup } from "@/lib/cleanup"

export const runtime = "nodejs"

export async function GET() {
  return handleRequest()
}

export async function POST() {
  return handleRequest()
}

async function handleRequest() {
  try {
    const payload = await performCleanup()
    return NextResponse.json(payload)
  } catch (error) {
    console.error("Cleanup failed", error)
    return NextResponse.json({ error: "Failed to perform cleanup." }, { status: 500 })
  }
}
