import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
         // @ts-ignore

    const userId = session.user.id
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 100

    // Get practiced words separately since there's no direct relation
    const practicedWords = await prisma.practicedWord.findMany({
      where: { userId },
      select: { baseForm: true, type: true }
    })

    // Get extracted words with valid relations
    const extractedWords = await prisma.extractedWord.findMany({
      where: { savedText: { userId } },
      include: {
        savedText: { select: { id: true, title: true, dateAdded: true } },
        verb: true,
        noun: true,
        adjective: true
      },
    })

    // Create lookup set for practiced words
    const practicedSet = new Set(
      practicedWords.map(pw => `${pw.baseForm.toLowerCase()}:${pw.type}`)
    )

    const wordGroups = new Map()

    extractedWords.forEach((word) => {
      const key = `${word.baseForm.toLowerCase()}:${word.type}`
      const isPracticed = practicedSet.has(key)

      if (!wordGroups.has(key)) {
        wordGroups.set(key, {
          occurrences: [],
          texts: new Set(),
          practiced: isPracticed,
          baseForm: word.baseForm,
          type: word.type,
          gender: word.gender,
          level: word.level || "Unknown",
          translation: word.translation || "",
          tense: word.tense,
          case: word.case,
        })
      }

      const group = wordGroups.get(key)
      if (word.sentence) {
        group.occurrences.push({
          textTitle: word.savedText?.title || "Untitled",
          date: word.savedText?.dateAdded?.toISOString() || new Date().toISOString(),
          sentence: word.sentence,
          translation: word.sentenceTranslation || "",
        })
      }

      if (word.savedText?.id) {
        group.texts.add(word.savedText.id)
      }
    })

    const frequencyData = Array.from(wordGroups.entries()).map(([key, group]) => ({
      id: key, // Use the composite key as ID
      text: group.baseForm,
      baseForm: group.baseForm,
      type: group.type,
      level: group.level,
      translation: group.translation,
      gender: group.gender,
      tense: group.tense,
      case: group.case,
      practiced: group.practiced,
      frequency: group.occurrences.length,
      textsCount: group.texts.size,
      occurrences: group.occurrences.slice(0, 5),
    }))

    return NextResponse.json(
      frequencyData.sort((a, b) => b.frequency - a.frequency).slice(0, limit)
    )

  } catch (error) {
    console.error("Error fetching frequency data:", error)
    return NextResponse.json(
      { message: "Failed to fetch frequency data", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}