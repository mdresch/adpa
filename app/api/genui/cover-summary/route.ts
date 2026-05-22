import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { generateCoverSummary } from "@/lib/openui/generateCoverSummary"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as {
      documentTitle?: string
      content?: string
      fallbackBlurb?: string
    }

    const content = typeof body.content === "string" ? body.content.trim() : ""
    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 })
    }

    const result = await generateCoverSummary({
      documentTitle: body.documentTitle,
      content,
      fallbackBlurb: body.fallbackBlurb,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
