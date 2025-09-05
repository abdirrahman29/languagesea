// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userProgress: true,
        _count: {
          select: {
            savedTexts: true,
            practicedWords: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get vocabulary stats
    const vocabularyStats = await prisma.extractedWord.groupBy({
      by: ['type'],
      where: {
        savedText: { userId: session.user.id }
      },
      _count: { type: true }
    })

    const statsMap = vocabularyStats.reduce((acc, stat) => {
      acc[stat.type] = stat._count.type
      return acc
    }, {} as Record<string, number>)

    // Get recent activity
    const recentTexts = await prisma.savedText.findMany({
      where: { userId: session.user.id },
      orderBy: { dateAdded: 'desc' },
      take: 5,
      select: {
        title: true,
        dateAdded: true,
        wordCount: true
      }
    })

    const recentPractice = await prisma.practicedWord.findMany({
      where: {
        userId: session.user.id,
        lastPracticed: { not: null }
      },
      orderBy: { lastPracticed: 'desc' },
      take: 5,
      select: {
        baseForm: true,
        type: true,
        lastPracticed: true,
        timesCorrect: true
      }
    })

    // Calculate streak
    const streak = await calculateStreak(session.user.id)

    // Calculate total practice time (estimate based on practice sessions)
    const totalPracticeTime = user._count.practicedWords * 2 // Estimate 2 minutes per word

    // Calculate progress to next level
    const totalWords = Object.values(statsMap).reduce((sum, count) => sum + count, 0)
    const progressToNextLevel = calculateLevelProgress(totalWords, user.level)

    const recentActivity = [
      ...recentTexts.map(text => ({
        type: 'Text Processing',
        description: `Processed "${text.title}" (${text.wordCount} words)`,
        date: text.dateAdded.toISOString()
      })),
      ...recentPractice.map(practice => ({
        type: 'Practice',
        description: `Practiced "${practice.baseForm}" (${practice.type})`,
        date: practice.lastPracticed!.toISOString()
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

    const profile = {
      name: user.name,
      email: user.email,
      joinedDate: user.createdAt.toISOString(),
      stats: {
        totalWords,
        verbs: statsMap['VERB'] || 0,
        nouns: statsMap['NOUN'] || 0,
        adjectives: statsMap['ADJ'] || 0,
        adverbs: statsMap['ADVERB'] || 0,
        textsProcessed: user._count.savedTexts,
        practiceStreak: streak,
        totalPracticeTime,
        currentLevel: user.level,
        progressToNextLevel
      },
      recentActivity
    }

    return NextResponse.json({
      success: true,
      profile
    })

  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email } = body

    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if email is already taken by another user
    if (email !== session.user.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: session.user.id }
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email is already taken' },
          { status: 400 }
        )
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase()
      },
      select: {
        name: true,
        email: true
      }
    })

    return NextResponse.json({
      success: true,
      profile: updatedUser
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

// Helper functions
async function calculateStreak(userId: string): Promise<number> {
  try {
    const practiceHistory = await prisma.practicedWord.findMany({
      where: { 
        userId,
        lastPracticed: { not: null }
      },
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

function calculateLevelProgress(totalWords: number, currentLevel: string): number {
  const levelThresholds = {
    'A1': 500,
    'A2': 1000,
    'B1': 2000,
    'B2': 3500,
    'C1': 5000,
    'C2': 8000
  }

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const currentIndex = levels.indexOf(currentLevel)
  
  if (currentIndex === -1 || currentIndex === levels.length - 1) {
    return 100 // Max level or invalid level
  }

  const currentThreshold = levelThresholds[currentLevel as keyof typeof levelThresholds]
  const nextLevel = levels[currentIndex + 1]
  const nextThreshold = levelThresholds[nextLevel as keyof typeof levelThresholds]

  if (totalWords >= nextThreshold) {
    return 100
  }

  const progress = ((totalWords - currentThreshold) / (nextThreshold - currentThreshold)) * 100
  return Math.max(0, Math.min(100, progress))
}