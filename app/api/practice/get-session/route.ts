// Updated app/api/practice/get-session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PracticeEngine } from '@/lib/practice-engine'
import { SpacedRepetitionEngine } from '@/lib/spaced-repetition'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      theme, 
      savedTextIds, 
      source, 
      style, 
      wordCount = 6,
      userLevel,
      difficulty,
      length
    } = body

    console.log('Creating practice session with params:', {
      source,
      theme,
      savedTextIds,
      style,
      wordCount,
      userLevel
    })

    // Validate input based on source
    if (source === 'theme' && !theme) {
      return NextResponse.json(
        { error: 'Theme is required for theme-based practice' },
        { status: 400 }
      )
    }

    if (source === 'saved-texts' && (!savedTextIds || savedTextIds.length === 0)) {
      return NextResponse.json(
        { error: 'At least one saved text is required for text-based practice' },
        { status: 400 }
      )
    }

    if (!['conversation', 'article', 'story'].includes(style)) {
      return NextResponse.json(
        { error: 'Invalid style. Must be conversation, article, or story' },
        { status: 400 }
      )
    }

    const practiceEngine = new PracticeEngine(session.user.id)
    
    // Create practice session with the new parameters
    const practiceSession = await practiceEngine.createPracticeSession({
      theme,
      savedTextIds,
      source,
      style,
      wordCount
    })

    console.log('Practice session created with target words:', practiceSession.targetWords.length)

    // Enhance words with spaced repetition data
    const enhancedWords = practiceSession.targetWords.map(word => {
      let difficulty = 'medium'
      try {
        difficulty = SpacedRepetitionEngine.getGermanWordDifficulty(
          word.baseForm,
          word.type
        )
      } catch (error) {
        console.warn('Could not get word difficulty, using default:', error)
      }
      
      let card
      let mastery = 50 // Default mastery
      try {
        card = SpacedRepetitionEngine.createCard(
          word.baseForm,
          word.type,
          difficulty
        )

        mastery = SpacedRepetitionEngine.calculateMastery({
          ...card,
          repetitions: word.practiceCount,
          easeFactor: word.practiceCount > 0 ? 2.2 : card.easeFactor
        })
      } catch (error) {
        console.warn('Could not calculate mastery, using default:', error)
      }

      return {
        ...word,
        difficulty,
        mastery,
        color: getWordColor(word.familiarity),
        showTranslation: !word.isKnown && word.practiceCount < 3
      }
    })

    const sessionData = {
      ...practiceSession,
      targetWords: enhancedWords,
      sessionStats: {
        unknownWords: enhancedWords.filter(w => w.familiarity === 'unknown').length,
        learningWords: enhancedWords.filter(w => w.familiarity === 'learning').length,
        familiarWords: enhancedWords.filter(w => w.familiarity === 'familiar').length,
        masteredWords: enhancedWords.filter(w => w.familiarity === 'mastered').length,
        averageMastery: enhancedWords.length > 0 ? Math.round(
          enhancedWords.reduce((sum, w) => sum + w.mastery, 0) / enhancedWords.length
        ) : 0
      }
    }

    console.log('Session data prepared successfully')

    return NextResponse.json({
      success: true,
      session: sessionData
    })

  } catch (error: any) {
    console.error('Error creating practice session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create practice session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const practiceEngine = new PracticeEngine(session.user.id)

    if (action === 'themes') {
      // Get available themes
      const themes = await practiceEngine.getAvailableThemes()
      return NextResponse.json({
        success: true,
        themes: themes.filter(theme => theme.wordCount >= 3)
      })
    }

    if (action === 'saved-texts') {
      // Get available saved texts
      const savedTexts = await practiceEngine.getAvailableSavedTexts()
      return NextResponse.json({
        success: true,
        savedTexts
      })
    }

    if (action === 'stats') {
      // Get practice statistics
      const userLevel = await practiceEngine.getUserLevel()
      
      // Get recent practice activity
      const recentActivity = await prisma.practicedWord.findMany({
        where: {
          userId: session.user.id,
          lastPracticed: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        orderBy: { lastPracticed: 'desc' },
        take: 10
      })

      // Calculate streak
      const streak = await calculateStreak(session.user.id)

      return NextResponse.json({
        success: true,
        stats: {
          userLevel,
          recentActivity: recentActivity.length,
          streak,
          todaysPractice: recentActivity.filter(activity => {
            const today = new Date()
            const practiceDate = new Date(activity.lastPracticed!)
            return (
              today.getDate() === practiceDate.getDate() &&
              today.getMonth() === practiceDate.getMonth() &&
              today.getFullYear() === practiceDate.getFullYear()
            )
          }).length
        }
      })
    }

    // Default: return both themes and saved texts
    const [themes, savedTexts] = await Promise.all([
      practiceEngine.getAvailableThemes(),
      practiceEngine.getAvailableSavedTexts()
    ])

    return NextResponse.json({
      success: true,
      themes: themes.filter(theme => theme.wordCount >= 3),
      savedTexts
    })

  } catch (error: any) {
    console.error('Error fetching practice data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch practice data' },
      { status: 500 }
    )
  }
}

// Helper functions
function getWordColor(familiarity: string): string {
  switch (familiarity) {
    case 'unknown': return 'red'
    case 'learning': return 'orange'
    case 'familiar': return 'yellow'
    case 'mastered': return 'green'
    default: return 'gray'
  }
}

async function calculateStreak(userId: string): Promise<number> {
  try {
    const practiceHistory = await prisma.practicedWord.findMany({
      where: { userId },
      select: { lastPracticed: true },
      orderBy: { lastPracticed: 'desc' },
      take: 100
    })

    if (practiceHistory.length === 0) return 0

    let streak = 0
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    // Group practices by date
    const practicesByDate = new Map<string, number>()
    
    practiceHistory.forEach(practice => {
      if (practice.lastPracticed) {
        const dateKey = practice.lastPracticed.toDateString()
        practicesByDate.set(dateKey, (practicesByDate.get(dateKey) || 0) + 1)
      }
    })

    // Count consecutive days
    while (practicesByDate.has(currentDate.toDateString())) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    }

    return streak
  } catch (error) {
    console.error('Error calculating streak:', error)
    return 0
  }
}