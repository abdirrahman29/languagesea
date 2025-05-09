import { type NextRequest, NextResponse } from "next/server"
import { getVocabularyStats } from "@/lib/data-service"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const stats = await getVocabularyStats(userId)
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching vocabulary stats:", error)
    return NextResponse.json({ error: "Failed to fetch vocabulary statistics" }, { status: 500 })
  }
}
