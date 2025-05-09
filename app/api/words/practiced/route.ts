import { type NextRequest, NextResponse } from "next/server"
import { markWordAsPracticed } from "@/lib/data-service"

export async function POST(req: NextRequest) {
  try {
    const { wordId, userId } = await req.json()

    if (!wordId || !userId) {
      return NextResponse.json({ error: "Word ID and User ID are required" }, { status: 400 })
    }

    const result = await markWordAsPracticed(Number(wordId), userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to mark word as practiced" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking word as practiced:", error)
    return NextResponse.json({ error: "Failed to mark word as practiced" }, { status: 500 })
  }
}
