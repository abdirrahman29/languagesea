import { type NextRequest, NextResponse } from "next/server"
import { fetchNouns } from "@/lib/data-service"

export async function GET(req: NextRequest) {
  try {
    // Get userId from query parameters
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")

    // Fetch nouns, filtering by userId if provided
    const nouns = await fetchNouns(userId || undefined)
    return NextResponse.json(nouns)
  } catch (error) {
    console.error("Error fetching nouns:", error)
    return NextResponse.json({ error: "Failed to fetch nouns" }, { status: 500 })
  }
}
