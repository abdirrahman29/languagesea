import { type NextRequest, NextResponse } from "next/server"
import { processGermanText } from "@/lib/text-processor"

export async function POST(req: NextRequest) {
  try {
    const { text, title } = await req.json()
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const result = await processGermanText(text, title)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error processing text:", error)
    return NextResponse.json({ error: "Failed to process text" }, { status: 500 })
  }
}
