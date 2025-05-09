import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET all themes
export async function GET(req: NextRequest) {
  try {
    const themes = await prisma.themeCategory.findMany({
      include: {
        words: true,
      },
    })
    return NextResponse.json(themes)
  } catch (error) {
    console.error("Error fetching themes:", error)
    return NextResponse.json({ error: "Failed to fetch themes" }, { status: 500 })
  }
}

// POST create a new theme
export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json()

    if (!name) {
      return NextResponse.json({ error: "Theme name is required" }, { status: 400 })
    }

    const theme = await prisma.themeCategory.create({
      data: {
        name,
        description,
      },
    })

    return NextResponse.json(theme)
  } catch (error) {
    console.error("Error creating theme:", error)
    return NextResponse.json({ error: "Failed to create theme" }, { status: 500 })
  }
}
