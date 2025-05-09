import { type NextRequest, NextResponse } from "next/server"
import { fetchAdjectives } from "@/lib/data-service"

export async function GET(req: NextRequest) {
  try {
    // Get userId from query parameters
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")

    // Fetch adjectives, filtering by userId if provided
    const adjectives = await fetchAdjectives(userId || undefined)
    return NextResponse.json(adjectives)
  } catch (error) {
    console.error("Error fetching adjectives:", error)
    return NextResponse.json({ error: "Failed to fetch adjectives" }, { status: 500 })
  }
}
