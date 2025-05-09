import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET a specific theme with its words
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const theme = await prisma.themeCategory.findUnique({
      where: {
        id: params.id,
      },
      include: {
        words: true,
      },
    })

    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 })
    }

    return NextResponse.json(theme)
  } catch (error) {
    console.error("Error fetching theme:", error)
    return NextResponse.json({ error: "Failed to fetch theme" }, { status: 500 })
  }
}

// PUT update a theme
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, description } = await req.json()

    const theme = await prisma.themeCategory.update({
      where: {
        id: params.id,
      },
      data: {
        name,
        description,
      },
    })

    return NextResponse.json(theme)
  } catch (error) {
    console.error("Error updating theme:", error)
    return NextResponse.json({ error: "Failed to update theme" }, { status: 500 })
  }
}

// DELETE a theme
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.themeCategory.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting theme:", error)
    return NextResponse.json({ error: "Failed to delete theme" }, { status: 500 })
  }
}
