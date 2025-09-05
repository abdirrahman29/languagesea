// app/api/user/language-settings/route.ts
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

    // Get user's language settings
    const languageSettings = await prisma.languageSettings.findUnique({
      where: { userId: session.user.id }
    })

    // Get user's basic language info from User model
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        learningLanguage: true,
        nativeLanguage: true,
        languageCode: true,
        translationCode: true,
        level: true
      }
    })

    // Merge settings with user data, providing defaults
    const settings = {
      learningLanguage: languageSettings?.learningLanguage || user?.learningLanguage || 'German',
      nativeLanguage: languageSettings?.nativeLanguage || user?.nativeLanguage || 'English',
      languageCode: languageSettings?.languageCode || user?.languageCode || 'de',
      translationCode: languageSettings?.translationCode || user?.translationCode || 'en',
      showTranslations: languageSettings?.showTranslations ?? true,
      autoPlayAudio: languageSettings?.autoPlayAudio ?? false,
      preferredVoice: languageSettings?.preferredVoice || '',
      practiceReminders: languageSettings?.practiceReminders ?? true,
      dailyGoal: languageSettings?.dailyGoal || 20,
      preferredDifficulty: languageSettings?.preferredDifficulty || 'auto',
      includeConjugations: languageSettings?.includeConjugations ?? true,
      includeCases: languageSettings?.includeCases ?? true,
      includeGender: languageSettings?.includeGender ?? true
    }

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('Error fetching language settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch language settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      learningLanguage,
      nativeLanguage,
      languageCode,
      translationCode,
      showTranslations,
      autoPlayAudio,
      preferredVoice,
      practiceReminders,
      dailyGoal,
      preferredDifficulty,
      includeConjugations,
      includeCases,
      includeGender
    } = body

    // Validate required fields
    if (!learningLanguage || !nativeLanguage || !languageCode || !translationCode) {
      return NextResponse.json(
        { error: 'Missing required language settings' },
        { status: 400 }
      )
    }

    // Validate daily goal
    if (dailyGoal < 1 || dailyGoal > 200) {
      return NextResponse.json(
        { error: 'Daily goal must be between 1 and 200' },
        { status: 400 }
      )
    }

    // Update user's basic language info
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        learningLanguage,
        nativeLanguage,
        languageCode,
        translationCode
      }
    })

    // Update or create detailed language settings
    const languageSettings = await prisma.languageSettings.upsert({
      where: { userId: session.user.id },
      update: {
        learningLanguage,
        nativeLanguage,
        languageCode,
        translationCode,
        showTranslations,
        autoPlayAudio,
        preferredVoice: preferredVoice || null,
        practiceReminders,
        dailyGoal,
        preferredDifficulty,
        includeConjugations,
        includeCases,
        includeGender
      },
      create: {
        userId: session.user.id,
        learningLanguage,
        nativeLanguage,
        languageCode,
        translationCode,
        showTranslations,
        autoPlayAudio,
        preferredVoice: preferredVoice || null,
        practiceReminders,
        dailyGoal,
        preferredDifficulty,
        includeConjugations,
        includeCases,
        includeGender
      }
    })

    // Update user progress if language changed
    const existingProgress = await prisma.userProgress.findUnique({
      where: { userId: session.user.id }
    })

    if (existingProgress && existingProgress.currentLanguage !== learningLanguage) {
      await prisma.userProgress.update({
        where: { userId: session.user.id },
        data: {
          currentLanguage: learningLanguage
        }
      })
    }

    return NextResponse.json({
      success: true,
      settings: languageSettings
    })

  } catch (error) {
    console.error('Error saving language settings:', error)
    return NextResponse.json(
      { error: 'Failed to save language settings' },
      { status: 500 }
    )
  }
}