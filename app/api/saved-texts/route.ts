import { type NextRequest, NextResponse } from "next/server"
import { fetchSavedTexts } from "@/lib/data-service"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const savedTexts = await fetchSavedTexts(userId)
    return NextResponse.json(savedTexts)
  } catch (error) {
    console.error("Error fetching saved texts:", error)
    return NextResponse.json({ error: "Failed to fetch saved texts" }, { status: 500 })
  }
}
