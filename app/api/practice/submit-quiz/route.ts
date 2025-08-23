// API route to handle quiz submissions and update practice statistics
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth' // Import your authOptions
import { PracticeEngine } from '@/lib/practice-engine'
import { SpacedRepetitionEngine } from '@/lib/spaced-repetition'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Pass authOptions to getServerSession
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      sessionId,
      wordData,
      selectedAnswer,
      correctAnswer,
      responseTime,
      difficultyRating
    }: {
      sessionId: string
      wordData: {
        baseForm: string
        type: 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB'
        translation: string
        currentFamiliarity: string
      }
      selectedAnswer: string
      correctAnswer: string
      responseTime: number // milliseconds
      difficultyRating?: 'easy' | 'hard'
    } = body

    // Validate input
    if (!sessionId || !wordData || !selectedAnswer || !correctAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const isCorrect = selectedAnswer === correctAnswer
    const practiceEngine = new PracticeEngine(session.user.id)

    // Update practice statistics
    await practiceEngine.updateWordPractice(
      wordData.baseForm,
      wordData.type,
      isCorrect
    )

    // Get updated practice record to calculate new familiarity
    const updatedPractice = await prisma.practicedWord.findFirst({
      where: {
        userId: session.user.id,
        baseForm: wordData.baseForm,
        type: wordData.type
      }
    })

    // Calculate spaced repetition data
    const quality = SpacedRepetitionEngine.convertResponseToQuality(
      isCorrect,
      responseTime,
      difficultyRating
    )

    const totalPracticeCount = updatedPractice 
      ? updatedPractice.timesCorrect + updatedPractice.timesWrong 
      : 1

    const accuracy = updatedPractice 
      ? updatedPractice.timesCorrect / (updatedPractice.timesCorrect + updatedPractice.timesWrong)
      : (isCorrect ? 1 : 0)

    // Determine new familiarity level
    const newFamiliarity = calculateNewFamiliarity(totalPracticeCount, accuracy)
    const mastery = calculateMasteryPercentage(totalPracticeCount, accuracy)

    // Generate feedback message
    const feedback = generateFeedback(
      isCorrect,
      wordData.baseForm,
      wordData.translation,
      responseTime,
      totalPracticeCount,
      newFamiliarity
    )

    // Check if user should get encouragement/achievement
    const achievement = checkForAchievements(
      updatedPractice?.timesCorrect || (isCorrect ? 1 : 0),
      totalPracticeCount,
      newFamiliarity,
      wordData.currentFamiliarity
    )

    // Update session statistics
    await updateSessionStats(session.user.id, sessionId, isCorrect, responseTime)

    const response = {
      success: true,
      result: {
        isCorrect,
        feedback,
        wordProgress: {
          baseForm: wordData.baseForm,
          oldFamiliarity: wordData.currentFamiliarity,
          newFamiliarity,
          practiceCount: totalPracticeCount,
          accuracy: Math.round(accuracy * 100),
          mastery,
          nextReviewIn: calculateNextReview(totalPracticeCount, accuracy)
        },
        achievement: achievement || null,
        sessionStats: await getUpdatedSessionStats(session.user.id, sessionId)
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error processing quiz submission:', error)
    return NextResponse.json(
      { error: 'Failed to process quiz submission' },
      { status: 500 }
    )
  }
}

// Generate quiz for a specific word
export async function GET(request: NextRequest) {
  try {
    // Pass authOptions to getServerSession
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const baseForm = searchParams.get('baseForm')
    const type = searchParams.get('type') as 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB'
    const theme = searchParams.get('theme')

    if (!baseForm || !type) {
      return NextResponse.json(
        { error: 'baseForm and type parameters are required' },
        { status: 400 }
      )
    }

    // Get word information
    const wordData = await getWordData(baseForm, type, theme || '')
    
    if (!wordData) {
      return NextResponse.json(
        { error: 'Word not found' },
        { status: 404 }
      )
    }

    // Generate quiz options
    const quiz = await generateQuizOptions(wordData, type, theme || '')

    return NextResponse.json({
      success: true,
      quiz: {
        word: baseForm,
        type,
        question: `What does "${baseForm}" mean?`,
        options: quiz.options,
        context: wordData.context || `The word "${baseForm}" is a ${type.toLowerCase()}.`
      }
    })

  } catch (error) {
    console.error('Error generating quiz:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}

// Helper Functions

function calculateNewFamiliarity(practiceCount: number, accuracy: number): string {
  if (practiceCount === 0) return 'unknown'
  if (practiceCount < 3) return 'learning'
  if (practiceCount < 6 || accuracy < 0.8) return 'familiar'
  return 'mastered'
}

function calculateMasteryPercentage(practiceCount: number, accuracy: number): number {
  const practiceScore = Math.min(practiceCount * 15, 75) // Max 75% from practice count
  const accuracyScore = accuracy * 25 // Max 25% from accuracy
  return Math.min(100, practiceScore + accuracyScore)
}

function generateFeedback(
  isCorrect: boolean,
  baseForm: string,
  translation: string,
  responseTime: number,
  practiceCount: number,
  newFamiliarity: string
): string {
  if (isCorrect) {
    const timeBonus = responseTime < 3000 ? ' Great speed!' : ''
    const progressMsg = practiceCount >= 3 
      ? ` You're getting good at this word!`
      : ` Keep practicing to master it.`
    
    return `✅ Correct! "${baseForm}" means "${translation}".${timeBonus}${progressMsg}`
  } else {
    return `❌ Not quite. "${baseForm}" means "${translation}". You'll see this word again soon.`
  }
}

function checkForAchievements(
  correctCount: number,
  totalPractice: number,
  newFamiliarity: string,
  oldFamiliarity: string
): { type: string; message: string; icon: string } | null {
  // First correct answer
  if (correctCount === 1 && totalPractice === 1) {
    return {
      type: 'first_correct',
      message: 'First word learned! 🎉',
      icon: '🌟'
    }
  }

  // Familiarity level up
  if (newFamiliarity !== oldFamiliarity) {
    const messages = {
      'learning': { message: 'Word promoted to Learning! 📈', icon: '🟠' },
      'familiar': { message: 'Word is now Familiar! 📚', icon: '🟡' },
      'mastered': { message: 'Word Mastered! 🏆', icon: '🟢' }
    }
    
    if (messages[newFamiliarity as keyof typeof messages]) {
      return {
        type: 'level_up',
        ...messages[newFamiliarity as keyof typeof messages]
      }
    }
  }

  // Practice milestones
  if ([5, 10, 25, 50].includes(correctCount)) {
    return {
      type: 'milestone',
      message: `${correctCount} correct answers! 🎯`,
      icon: '🔥'
    }
  }

  return null
}

function calculateNextReview(practiceCount: number, accuracy: number): string {
  if (practiceCount === 0) return 'Now'
  if (practiceCount < 3) return '1 day'
  if (accuracy < 0.7) return '2 days'
  if (practiceCount < 6) return '3-5 days'
  return '1 week'
}

async function updateSessionStats(
  userId: string,
  sessionId: string,
  isCorrect: boolean,
  responseTime: number
) {
  // This could store session-specific stats in a separate table
  // For now, we'll just update user's overall practice stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Update or create daily practice record
  await prisma.userProgress.upsert({
    where: { userId },
    update: {
      lastActive: new Date()
    },
    create: {
      userId,
      lastActive: new Date()
    }
  })
}

async function getUpdatedSessionStats(userId: string, sessionId: string) {
  const todaysPractice = await prisma.practicedWord.count({
    where: {
      userId,
      lastPracticed: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }
  })

  return {
    practiceToday: todaysPractice,
    sessionProgress: `${todaysPractice}/20` // Example target
  }
}

async function getWordData(baseForm: string, type: string, theme: string) {
  // Get word from theme categories
  const themeWord = await prisma.themeCategoryWord.findFirst({
    where: {
      text: { equals: baseForm, mode: 'insensitive' },
      type,
      ...(theme && {
        themeCategory: {
          name: { contains: theme, mode: 'insensitive' }
        }
      })
    },
    include: {
      themeCategory: true
    }
  })

  return themeWord ? {
    baseForm: themeWord.text,
    translation: themeWord.translation,
    type: themeWord.type,
    level: themeWord.level,
    theme: themeWord.themeCategory.name,
    context: `This word is related to ${themeWord.themeCategory.name.toLowerCase()}.`
  } : null
}

async function generateQuizOptions(
  wordData: any,
  type: string,
  theme: string
) {
  // Get similar words as distractors
  const distractors = await prisma.themeCategoryWord.findMany({
    where: {
      type,
      NOT: { text: wordData.baseForm },
      ...(theme && {
        themeCategory: {
          name: { contains: theme, mode: 'insensitive' }
        }
      })
    },
    take: 3
  })

  const options = [
    { id: 'correct', text: wordData.translation, isCorrect: true },
    ...distractors.map((word, index) => ({
      id: `distractor_${index}`,
      text: word.translation,
      isCorrect: false
    }))
  ]

  // Shuffle options
  return {
    options: options.sort(() => Math.random() - 0.5)
  }
}