// app/api/saved-texts/route.ts - Debugged version
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log("❌ No session or user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const userId = session.user.id
    const limit = parseInt(url.searchParams.get("limit") || "1000")
    const offset = parseInt(url.searchParams.get("offset") || "0")
    const search = url.searchParams.get("search")

    console.log(`🔍 Fetching saved texts for user ${userId}, limit: ${limit}, offset: ${offset}`)

    // Build where clause
    const whereClause: any = {
      userId: userId
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ]
    }

    // First, let's get a simple count to verify data exists
    const totalCount = await prisma.savedText.count({
      where: whereClause
    })

    console.log(`📊 Total count from database: ${totalCount}`)

    if (totalCount === 0) {
      console.log("⚠️ No saved texts found in database")
      return NextResponse.json({
        savedTexts: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        }
      })
    }

    // Get the actual data
    const savedTexts = await prisma.savedText.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        level: true,
        excerpt: true,
        wordCount: true,
        readingTime: true,
        dateAdded: true,
        language: true,
        languageCode: true,
        // Get stats
        stats: {
          select: {
            totalWords: true,
            newWords: true,
            verbs: true,
            nouns: true,
            adjectives: true,
            adverbs: true
          }
        },
        // Count extracted words efficiently
        _count: {
          select: {
            extractedWords: true
          }
        }
      },
      orderBy: {
        dateAdded: 'desc'
      },
      take: limit,
      skip: offset
    })

    console.log(`📝 Raw saved texts from database:`, savedTexts.map(t => ({ 
      id: t.id, 
      title: t.title, 
      extractedWordCount: t._count.extractedWords,
      wordCount: t.wordCount 
    })))

    // Transform the data to match expected format
    const transformedTexts = savedTexts.map(text => {
      const transformed = {
        id: text.id.toString(),
        title: text.title,
        level: text.level,
        excerpt: text.excerpt || text.title.substring(0, 100) + '...',
        wordCount: text._count.extractedWords, // Use extracted words count for practice
        totalWords: text.wordCount, // Original word count
        readingTime: text.readingTime,
        dateAdded: text.dateAdded.toISOString(),
        language: text.language,
        languageCode: text.languageCode,
        stats: text.stats ? {
          totalWords: text.stats.totalWords,
          newWords: text.stats.newWords,
          verbs: text.stats.verbs,
          nouns: text.stats.nouns,
          adjectives: text.stats.adjectives,
          adverbs: text.stats.adverbs
        } : null
      }
      
      console.log(`🔄 Transformed text ${text.id}:`, {
        id: transformed.id,
        title: transformed.title,
        wordCount: transformed.wordCount,
        totalWords: transformed.totalWords
      })
      
      return transformed
    })

    const response = {
      savedTexts: transformedTexts,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    }

    console.log(`✅ Sending response with ${transformedTexts.length} texts`)
    console.log(`📤 Response structure:`, {
      savedTextsLength: response.savedTexts.length,
      firstTextId: response.savedTexts[0]?.id,
      firstTextTitle: response.savedTexts[0]?.title,
      firstTextWordCount: response.savedTexts[0]?.wordCount
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error("❌ Error fetching saved texts:", error)
    console.error("❌ Full error stack:", error instanceof Error ? error.stack : error)
    return NextResponse.json({ 
      error: "Failed to fetch saved texts",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// Enhanced POST endpoint for practice selection
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log("❌ POST: No session or user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    console.log(`📨 POST request with action: ${action}`)

    if (action === 'practice-list') {
      const userId = session.user.id
      
      // Get minimal data for practice selection dropdown
      const savedTexts = await prisma.savedText.findMany({
        where: {
          userId: userId
        },
        select: {
          id: true,
          title: true,
          level: true,
          language: true,
          _count: {
            select: {
              extractedWords: true
            }
          }
        },
        orderBy: {
          dateAdded: 'desc'
        },
        take: 100 // Reasonable limit for practice selection
      })

      console.log(`🎯 Practice list raw data:`, savedTexts.map(t => ({
        id: t.id,
        title: t.title,
        wordCount: t._count.extractedWords
      })))

      const practiceTexts = savedTexts
      .filter(text => text._count.extractedWords > 0)
      .map(text => ({
          id: text.id.toString(),
          title: text.title,
          wordCount: text._count.extractedWords,
          level: text.level,
          language: text.language
        }))

      console.log(`🎯 Filtered practice texts:`, practiceTexts)

      return NextResponse.json({
        success: true,
        texts: practiceTexts
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error) {
    console.error("❌ Error in saved texts POST:", error)
    return NextResponse.json({ 
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}