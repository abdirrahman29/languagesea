import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET words for a specific theme
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const words = await prisma.themeCategoryWord.findMany({
      where: {
        themeCategoryId: params.id,
      },
    })

    return NextResponse.json(words)
  } catch (error) {
    console.error("Error fetching theme words:", error)
    return NextResponse.json({ error: "Failed to fetch theme words" }, { status: 500 })
  }
}

// POST add a word to a theme
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { text, type, level, translation, gender } = await req.json()

    if (!text || !type || !level || !translation) {
      return NextResponse.json({ error: "Text, type, level, and translation are required fields" }, { status: 400 })
    }

    const word = await prisma.themeCategoryWord.create({
      data: {
        themeCategoryId: params.id,
        text,
        type,
        level,
        translation,
        gender,
      },
    })

    return NextResponse.json(word)
  } catch (error) {
    console.error("Error adding word to theme:", error)
    return NextResponse.json({ error: "Failed to add word to theme" }, { status: 500 })
  }
}

// DELETE a word from a theme
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url)
    const wordId = url.searchParams.get("wordId")

    if (!wordId) {
      return NextResponse.json({ error: "Word ID is required" }, { status: 400 })
    }

    await prisma.themeCategoryWord.delete({
      where: {
        id: wordId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing word from theme:", error)
    return NextResponse.json({ error: "Failed to remove word from theme" }, { status: 500 })
  }
}
