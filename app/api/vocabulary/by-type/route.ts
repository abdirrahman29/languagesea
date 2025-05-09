import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Create a new PrismaClient instance
const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user session
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
       // @ts-ignore

    const userId = session.user.id
    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get("type")
    const limit = Number(searchParams.get("limit")) || 10

    console.log(`Fetching words for user ${userId}, type=${type}, limit=${limit}`)

    if (!type) {
      return NextResponse.json({ message: "Type parameter is required" }, { status: 400 })
    }
      // @ts-ignore

    let words = []

    // Normalize the type parameter to handle both singular and plural forms
    const normalizedType = type.toUpperCase().replace(/S$/, "")

    if (normalizedType === "VERB") {
      // First get the extracted words with their verbIds
      const extractedWords = await prisma.extractedWord.findMany({
        where: {
          savedText: {
            userId: userId,
          },
          type: "VERB",
          verbId: {
            not: null,
          },
        },
        select: {
          verbId: true,
          baseForm: true,
          translation: true,
        },
        distinct: ["verbId"],
        take: 100, // Get more than we need to ensure we have enough after filtering
      })

      console.log(`Found ${extractedWords.length} extracted verbs`)

      // Then fetch the actual verb data using those IDs
      if (extractedWords.length > 0) {
        const verbIds = extractedWords.map((word) => word.verbId).filter((id): id is number => id !== null)

        const verbs = await prisma.verb.findMany({
          where: {
            id: {
              in: verbIds,
            },
          },
          take: limit,
          orderBy: {
            baseForm: "asc",
          },
        })

        console.log(`Found ${verbs.length} verbs from IDs`)

        // Transform to a common format
        words = verbs.map((verb) => {
          // Find the matching extracted word to get the translation
          const extractedWord = extractedWords.find((w) => w.verbId === verb.id)

          return {
            id: verb.id,
            text: verb.baseForm,
            type: "VERB",
            level: verb.level,
            translation: extractedWord?.translation || "",
          }
        })
      }

      // If no words found, provide fallback data
      if (words.length === 0) {
        console.log("No verbs found, using fallback data")
        words = getFallbackVerbs()
      }
    } else if (normalizedType === "NOUN") {
      // First get the extracted words with their nounIds
      const extractedWords = await prisma.extractedWord.findMany({
        where: {
          savedText: {
            userId: userId,
          },
          type: "NOUN",
          nounId: {
            not: null,
          },
        },
        select: {
          nounId: true,
          baseForm: true,
          translation: true,
          gender: true,
        },
        distinct: ["nounId"],
        take: 100,
      })

      console.log(`Found ${extractedWords.length} extracted nouns`)

      // Then fetch the actual noun data using those IDs
      if (extractedWords.length > 0) {
        const nounIds = extractedWords.map((word) => word.nounId).filter((id): id is number => id !== null)

        const nouns = await prisma.noun.findMany({
          where: {
            id: {
              in: nounIds,
            },
          },
          take: limit,
          orderBy: {
            baseForm: "asc",
          },
        })

        console.log(`Found ${nouns.length} nouns from IDs`)

        // Transform to a common format
        words = nouns.map((noun) => {
          // Find the matching extracted word to get the translation and gender
          const extractedWord = extractedWords.find((w) => w.nounId === noun.id)

          return {
            id: noun.id,
            text: noun.baseForm,
            type: "NOUN",
            level: noun.level,
            gender: noun.gender || extractedWord?.gender,
            translation: extractedWord?.translation || "",
          }
        })
      }

      // If no words found, provide fallback data
      if (words.length === 0) {
        console.log("No nouns found, using fallback data")
        words = getFallbackNouns()
      }
    } else if (normalizedType === "ADJECTIVE" || normalizedType === "ADJ") {
      // First get the extracted words with their adjectiveIds
      const extractedWords = await prisma.extractedWord.findMany({
        where: {
          savedText: {
            userId: userId,
          },
          type: "ADJECTIVE",
          adjectiveId: {
            not: null,
          },
        },
        select: {
          adjectiveId: true,
          baseForm: true,
          translation: true,
        },
        distinct: ["adjectiveId"],
        take: 100,
      })

      console.log(`Found ${extractedWords.length} extracted adjectives`)

      // Then fetch the actual adjective data using those IDs
      if (extractedWords.length > 0) {
        const adjectiveIds = extractedWords.map((word) => word.adjectiveId).filter((id): id is number => id !== null)

        const adjectives = await prisma.adjective.findMany({
          where: {
            id: {
              in: adjectiveIds,
            },
          },
          take: limit,
          orderBy: {
            baseForm: "asc",
          },
        })

        console.log(`Found ${adjectives.length} adjectives from IDs`)

        // Transform to a common format
        words = adjectives.map((adjective) => {
          // Find the matching extracted word to get the translation
          const extractedWord = extractedWords.find((w) => w.adjectiveId === adjective.id)

          return {
            id: adjective.id,
            text: adjective.baseForm,
            type: "ADJECTIVE",
            level: adjective.level,
            translation: extractedWord?.translation || "",
          }
        })
      }

      // If no words found, provide fallback data
      if (words.length === 0) {
        console.log("No adjectives found, using fallback data")
        words = getFallbackAdjectives()
      }
    } else {
      return NextResponse.json({ message: "Invalid type" }, { status: 400 })
    }
      // @ts-ignore

    return NextResponse.json(words)
  } catch (error) {
    console.error("Error fetching words:", error)
    return NextResponse.json({ message: "Failed to fetch words", error: String(error) }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// Fallback data functions
function getFallbackVerbs() {
  return [
    { id: 1, text: "gehen", type: "VERB", level: "A1", translation: "to go" },
    { id: 2, text: "sein", type: "VERB", level: "A1", translation: "to be" },
    { id: 3, text: "haben", type: "VERB", level: "A1", translation: "to have" },
    { id: 4, text: "machen", type: "VERB", level: "A1", translation: "to make/do" },
    { id: 5, text: "kommen", type: "VERB", level: "A1", translation: "to come" },
  ]
}

function getFallbackNouns() {
  return [
    { id: 1, text: "Haus", type: "NOUN", level: "A1", gender: "NEUT", translation: "house" },
    { id: 2, text: "Mann", type: "NOUN", level: "A1", gender: "MASC", translation: "man" },
    { id: 3, text: "Frau", type: "NOUN", level: "A1", gender: "FEM", translation: "woman" },
    { id: 4, text: "Kind", type: "NOUN", level: "A1", gender: "NEUT", translation: "child" },
    { id: 5, text: "Buch", type: "NOUN", level: "A1", gender: "NEUT", translation: "book" },
  ]
}

function getFallbackAdjectives() {
  return [
    { id: 1, text: "gut", type: "ADJECTIVE", level: "A1", translation: "good" },
    { id: 2, text: "schön", type: "ADJECTIVE", level: "A1", translation: "beautiful" },
    { id: 3, text: "groß", type: "ADJECTIVE", level: "A1", translation: "big" },
    { id: 4, text: "klein", type: "ADJECTIVE", level: "A1", translation: "small" },
    { id: 5, text: "alt", type: "ADJECTIVE", level: "A1", translation: "old" },
  ]
}
