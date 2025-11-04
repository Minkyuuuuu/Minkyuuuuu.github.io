import { NextResponse, type NextRequest } from "next/server"

const REALM = "Protected Uploads"

const unauthorizedResponse = () =>
  new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
    },
  })

const missingConfigResponse = (missing: string[]) =>
  new NextResponse(`Server configuration error: missing ${missing.join(", ")}`, { status: 500 })

export function middleware(request: NextRequest) {
  const username = process.env.UPLOAD_USERNAME
  const password = process.env.UPLOAD_PASSWORD

  const missingEnv = [
    username ? null : "UPLOAD_USERNAME",
    password ? null : "UPLOAD_PASSWORD",
  ].filter((value): value is string => Boolean(value))

  if (missingEnv.length > 0) {
    console.error(`Basic auth middleware misconfigured; missing env vars: ${missingEnv.join(", ")}`)
    return missingConfigResponse(missingEnv)
  }

  const authorizationHeader = request.headers.get("authorization")

  if (!authorizationHeader) {
    return unauthorizedResponse()
  }

  const [scheme, encodedCredentials] = authorizationHeader.split(" ")

  if (scheme?.toLowerCase() !== "basic" || !encodedCredentials) {
    return unauthorizedResponse()
  }

  let decoded: string

  try {
    decoded = atob(encodedCredentials)
  } catch (error) {
    console.warn("Unable to decode authorization header", error)
    return unauthorizedResponse()
  }

  const separatorIndex = decoded.indexOf(":")

  if (separatorIndex === -1) {
    return unauthorizedResponse()
  }

  const providedUsername = decoded.slice(0, separatorIndex)
  const providedPassword = decoded.slice(separatorIndex + 1)

  if (providedUsername !== username || providedPassword !== password) {
    return unauthorizedResponse()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/upload", "/api/upload", "/api/cleanup"],
}
