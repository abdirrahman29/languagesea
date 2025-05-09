import { type NextRequest, NextResponse } from "next/server"
import { fetchVerbs } from "@/lib/data-service"

export async function GET(req: NextRequest) {
  try {
    // Get userId from query parameters
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")

    // Fetch verbs, filtering by userId if provided
    const verbs = await fetchVerbs(userId || undefined)
    return NextResponse.json(verbs)
  } catch (error) {
    console.error("Error fetching verbs:", error)
    return NextResponse.json({ error: "Failed to fetch verbs" }, { status: 500 })
  }
}
