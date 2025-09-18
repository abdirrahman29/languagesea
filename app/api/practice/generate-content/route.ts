// Updated app/api/practice/generate-content/route.ts - Enhanced with category-specific word selection and Gemini integration
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createTranslator } from '@/lib/translator'
import { prisma } from '@/lib/db'

// Get user's language settings
async function getUserLanguageSettings(userId: string) {
  try {
    const languageSettings = await prisma.languageSettings.findUnique({
      where: { userId }
    })

    if (languageSettings) {
      return {
        languageCode: languageSettings.languageCode,
        translationCode: languageSettings.translationCode,
        learningLanguage: languageSettings.learningLanguage,
        nativeLanguage: languageSettings.nativeLanguage
      }
    }

    // Fallback to user's basic language settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        languageCode: true,
        translationCode: true,
        learningLanguage: true,
        nativeLanguage: true
      }
    })

    return {
      languageCode: user?.languageCode || 'de',
      translationCode: user?.translationCode || 'en',
      learningLanguage: user?.learningLanguage || 'German',
      nativeLanguage: user?.nativeLanguage || 'English'
    }
  } catch (error) {
    console.error('Error getting user language settings:', error)
    return {
      languageCode: 'de',
      translationCode: 'en',
      learningLanguage: 'German',
      nativeLanguage: 'English'
    }
  }
}

// Enhanced word selection with category-specific targeting
async function selectWordsByCategories(
  userId: string,
  config: {
    selectedCategories: string[]
    wordCounts: Record<string, number>
    level: string
    practiceSource: 'themes' | 'saved-texts'
    selectedTheme?: string
    selectedSavedTexts?: string[]
  }
) {
  const selectedWords: any[] = []
  
  console.log(`📊 Selecting words by categories:`, config.selectedCategories)
  console.log(`📊 Word counts:`, config.wordCounts)

  for (const category of config.selectedCategories) {
    const wordCount = config.wordCounts[category] || 5
    console.log(`🔍 Selecting ${wordCount} ${category} words...`)

    let categoryWords: any[] = []

    if (config.practiceSource === 'themes' && config.selectedTheme) {
      // Get words from specific theme
      const themeCategory = await prisma.themeCategory.findFirst({
        where: {
          name: { contains: config.selectedTheme, mode: 'insensitive' }
        }
      })

      if (themeCategory) {
        categoryWords = await prisma.themeCategoryWord.findMany({
          where: {
            themeCategoryId: themeCategory.id,
            type: category,
            level: { in: getLevelsUpTo(config.level) }
          },
          take: wordCount * 3, // Get more for selection
          orderBy: { text: 'asc' }
        })
      }
    } else if (config.practiceSource === 'saved-texts' && config.selectedSavedTexts) {
      // Get words from saved texts
      categoryWords = await prisma.extractedWord.findMany({
        where: {
          savedTextId: { in: config.selectedSavedTexts.map(id => parseInt(id)) },
          type: category,
          level: { in: getLevelsUpTo(config.level) },
          savedText: { userId }
        },
        take: wordCount * 3,
        orderBy: { baseForm: 'asc' }
      })
    }

    // Get practice history for prioritization
    const practiceHistory = await prisma.practicedWord.findMany({
      where: {
        userId,
        type: category,
        baseForm: { in: categoryWords.map(w => 'baseForm' in w ? w.baseForm : w.text) }
      }
    })

    const practiceMap = new Map(
      practiceHistory.map(p => [
        p.baseForm, 
        {
          count: p.timesCorrect + p.timesWrong,
          lastPracticed: p.lastPracticed,
          accuracy: p.timesCorrect / (p.timesCorrect + p.timesWrong) || 0
        }
      ])
    )

    // Score and select words
    const scoredWords = categoryWords.map(word => {
      const baseForm = 'baseForm' in word ? word.baseForm : word.text
      const practice = practiceMap.get(baseForm)
      
      let priority = 10 // Base priority
      
      if (!practice) {
        priority += 20 // Never practiced
      } else {
        const daysSince = practice.lastPracticed 
          ? (Date.now() - practice.lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
          : 999
          
        if (daysSince < 1) priority -= 15
        else if (daysSince < 3) priority -= 10
        else if (daysSince < 7) priority -= 5
        
        if (practice.count > 5 && practice.accuracy > 0.8) {
          priority -= 10 // Well-known words get lower priority
        }
        
        if (practice.count > 0 && practice.accuracy < 0.5) {
          priority += 10 // Difficult words get higher priority
        }
      }

      return {
        word,
        practice: practice || { count: 0, lastPracticed: null, accuracy: 0 },
        priority,
        baseForm,
        type: category,
        translation: word.translation,
        level: word.level
      }
    })

    // Select top words by priority
    const selectedCategoryWords = scoredWords
      .sort((a, b) => b.priority - a.priority)
      .slice(0, wordCount)
      .map(({ word, practice, baseForm, type, translation, level }) => ({
        baseForm,
        type,
        translation,
        level,
        practiceCount: practice.count,
        lastPracticed: practice.lastPracticed,
        isKnown: practice.count >= 3 && practice.accuracy > 0.7,
        familiarity: getFamiliarityLevel(practice.count, practice.accuracy),
        themes: config.selectedTheme ? [config.selectedTheme] : ['Mixed'],
        source: config.practiceSource
      }))

    selectedWords.push(...selectedCategoryWords)
    console.log(`✅ Selected ${selectedCategoryWords.length} ${category} words`)
  }

  console.log(`🎯 Total selected words: ${selectedWords.length}`)
  return selectedWords
}

// Helper function to get levels up to the target level
function getLevelsUpTo(targetLevel: string): string[] {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const targetIndex = levels.indexOf(targetLevel)
  return levels.slice(0, targetIndex + 1)
}

// Helper function to determine familiarity level
function getFamiliarityLevel(practiceCount: number, accuracy: number): string {
  if (practiceCount === 0) return 'unknown'
  if (practiceCount < 3) return 'learning'
  if (practiceCount < 6 || accuracy < 0.8) return 'familiar'
  return 'mastered'
}

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
      sessionId,
      config // New enhanced configuration object
    }: {
      sessionId: string
      config: {
        selectedCategories: string[]
        wordCounts: Record<string, number>
        level: string
        practiceSource: 'themes' | 'saved-texts'
        selectedTheme?: string
        selectedSavedTexts?: string[]
        contentStyle: string
        tenseFocus: string[]
        length: number
        difficulty: 'easy' | 'medium' | 'hard'
      }
    } = body

    console.log(`🚀 Generating enhanced practice content with categories: ${config.selectedCategories.join(', ')}`)
    console.log(`📝 Content style: ${config.contentStyle}, Tenses: ${config.tenseFocus.join(', ')}`)

    // Validate input
    if (!config.selectedCategories || config.selectedCategories.length === 0) {
      return NextResponse.json(
        { error: 'At least one word category must be selected' },
        { status: 400 }
      )
    }

    // Get user's language settings
    const languageSettings = await getUserLanguageSettings(session.user.id)

    // Select words based on categories and configuration
    const targetWords = await selectWordsByCategories(session.user.id, config)

    if (targetWords.length === 0) {
      return NextResponse.json(
        { error: 'No words available for the selected categories and criteria' },
        { status: 400 }
      )
    }

    console.log(`📚 Selected ${targetWords.length} words across ${config.selectedCategories.length} categories`)

    // Create enhanced translator with Gemini Flash 2.5 for practice content
    const translator = createTranslator(languageSettings.languageCode, languageSettings.translationCode)

    // Generate content using the enhanced method with Gemini Flash 2.5
    const generatedContent = await translator.generatePracticeContent(
      targetWords,
      config,
      languageSettings
    )

    console.log(`✅ Content generated successfully with ${generatedContent.learningText.length} characters`)

    // Parse the generated content and identify word positions
    const parsedContent = await parseContentWithWordPositions(
      generatedContent.learningText,
      targetWords
    )

    // Calculate quality metrics and content level assessment
    const qualityMetrics = {
      wordsUsed: parsedContent.words.filter(w => w.isTarget).length,
      totalTargetWords: targetWords.length,
      categoryDistribution: config.selectedCategories.reduce((acc, category) => {
        acc[category] = parsedContent.words.filter(w => w.isTarget && w.type === category).length
        return acc
      }, {} as Record<string, number>),
      averageWordLength: generatedContent.learningText.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / generatedContent.learningText.split(/\s+/).length,
      sentenceCount: generatedContent.learningText.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
      estimatedReadingTime: Math.ceil(generatedContent.learningText.split(/\s+/).length / 150) // words per minute
    }

    // NEW: Calculate overall content level based on vocabulary complexity
    const contentLevelAssessment = await assessContentLevel(
      parsedContent.words.filter(w => w.isTarget),
      generatedContent.learningText,
      config
    )

    console.log(`📊 Quality metrics:`, qualityMetrics)
    console.log(`📈 Content level assessment:`, contentLevelAssessment)

    const response = {
      sessionId,
      content: {
        [languageSettings.languageCode]: generatedContent.learningText,
        german: generatedContent.learningText, // Keep for backward compatibility
        [languageSettings.translationCode]: generatedContent.translationText,
        english: generatedContent.translationText, // Keep for backward compatibility
        words: parsedContent.words,
        sentences: parsedContent.sentences
      },
      metadata: {
        wordsUsed: qualityMetrics.wordsUsed,
        totalTargetWords: qualityMetrics.totalTargetWords,
        categoryDistribution: qualityMetrics.categoryDistribution,
        averageWordLength: qualityMetrics.averageWordLength,
        sentenceCount: qualityMetrics.sentenceCount,
        estimatedReadingTime: qualityMetrics.estimatedReadingTime,
        contentLevelAssessment,
        config,
        languageSettings,
        generationMethod: 'gemini-flash-2.5'
      }
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('❌ Error generating enhanced practice content:', error)
    return NextResponse.json(
      { error: 'Failed to generate practice content' },
      { status: 500 }
    )
  }
}

// NEW: Content level assessment function
async function assessContentLevel(
  targetWords: any[],
  generatedText: string,
  config: any
) {
  // Calculate level distribution of target words
  const levelCounts = targetWords.reduce((acc, word) => {
    const level = word.level || 'Unknown'
    acc[level] = (acc[level] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalTargetWords = targetWords.length
  const levelPercentages = Object.fromEntries(
    Object.entries(levelCounts).map(([level, count]) => [
      level,
      Math.round((count / totalTargetWords) * 100)
    ])
  )

  // Calculate text complexity metrics
  const sentences = generatedText.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = generatedText.split(/\s+/)
  
  const textComplexity = {
    averageSentenceLength: Math.round(words.length / sentences.length),
    averageWordLength: Math.round(words.reduce((sum, word) => sum + word.length, 0) / words.length),
    complexSentenceCount: sentences.filter(s => 
      (s.match(/,/g) || []).length >= 2 || // Multiple clauses
      s.length > 100 // Long sentences
    ).length,
    totalWords: words.length,
    totalSentences: sentences.length
  }

  // Determine overall content level based on multiple factors
  let primaryLevel = config.level // Start with user's selected level
  let actualLevel = 'A1' // Default to A1
  
  // Calculate weighted level based on vocabulary distribution
  const levelWeights = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }
  let weightedSum = 0
  let totalWords = 0
  
  Object.entries(levelCounts).forEach(([level, count]) => {
    if (levelWeights[level as keyof typeof levelWeights]) {
      weightedSum += levelWeights[level as keyof typeof levelWeights] * count
      totalWords += count
    }
  })
  
  if (totalWords > 0) {
    const averageWeight = weightedSum / totalWords
    const levels = Object.keys(levelWeights)
    actualLevel = levels[Math.min(Math.floor(averageWeight) - 1, levels.length - 1)] || 'A1'
  }

  // Adjust level based on text complexity
  let complexityAdjustment = 0
  
  // Sentence length adjustment
  if (textComplexity.averageSentenceLength > 15) complexityAdjustment += 1
  if (textComplexity.averageSentenceLength > 20) complexityAdjustment += 1
  
  // Complex sentence adjustment
  const complexSentenceRatio = textComplexity.complexSentenceCount / textComplexity.totalSentences
  if (complexSentenceRatio > 0.3) complexityAdjustment += 1
  if (complexSentenceRatio > 0.5) complexityAdjustment += 1
  
  // Word length adjustment
  if (textComplexity.averageWordLength > 6) complexityAdjustment += 1
  
  // Apply complexity adjustment
  const levelIndex = Object.keys(levelWeights).indexOf(actualLevel)
  const adjustedIndex = Math.min(levelIndex + complexityAdjustment, Object.keys(levelWeights).length - 1)
  const finalLevel = Object.keys(levelWeights)[adjustedIndex]

  // Determine if content level matches user expectation
  const levelMismatch = finalLevel !== config.level
  const levelDifference = levelWeights[finalLevel as keyof typeof levelWeights] - levelWeights[config.level as keyof typeof levelWeights]

  return {
    requestedLevel: config.level,
    actualLevel: finalLevel,
    levelMismatch,
    levelDifference, // Positive means harder than requested, negative means easier
    confidence: Math.round((Math.max(...Object.values(levelPercentages)) / 100) * 100), // Confidence based on dominant level
    
    vocabularyBreakdown: {
      levelDistribution: levelCounts,
      levelPercentages,
      dominantLevel: Object.entries(levelPercentages).reduce((a, b) => 
        levelPercentages[a[0]] > levelPercentages[b[0]] ? a : b
      )[0]
    },
    
    textComplexity,
    
    recommendations: generateLevelRecommendations(config.level, finalLevel, levelDifference, textComplexity)
  }
}

// Generate recommendations based on level assessment
function generateLevelRecommendations(
  requestedLevel: string,
  actualLevel: string,
  levelDifference: number,
  textComplexity: any
) {
  const recommendations = []

  if (levelDifference > 1) {
    recommendations.push({
      type: 'difficulty_too_high',
      message: `Content is significantly harder than ${requestedLevel}. Consider selecting fewer advanced words or choosing a different difficulty setting.`,
      severity: 'high'
    })
  } else if (levelDifference > 0) {
    recommendations.push({
      type: 'difficulty_slightly_high',
      message: `Content is slightly above ${requestedLevel} level. This can provide good challenge for learning.`,
      severity: 'medium'
    })
  } else if (levelDifference < -1) {
    recommendations.push({
      type: 'difficulty_too_low',
      message: `Content may be too easy for ${requestedLevel}. Try selecting more advanced categories or higher difficulty.`,
      severity: 'medium'
    })
  }

  if (textComplexity.averageSentenceLength > 25) {
    recommendations.push({
      type: 'sentence_complexity',
      message: 'Sentences are quite complex. Break them down when reading for better comprehension.',
      severity: 'low'
    })
  }

  if (textComplexity.complexSentenceCount / textComplexity.totalSentences > 0.6) {
    recommendations.push({
      type: 'grammar_complexity',
      message: 'High proportion of complex grammatical structures. Take time to analyze sentence structure.',
      severity: 'medium'
    })
  }

  return recommendations
}

// Parse content and identify word positions (enhanced)
async function parseContentWithWordPositions(
  learningText: string,
  targetWords: any[]
) {
  const words: Array<{
    word: string
    baseForm: string
    translation?: string
    isTarget: boolean
    position: { start: number; end: number }
    familiarity: string
    showTranslation: boolean
    type?: string
  }> = []

  const sentences = learningText.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  // Create a map of target words for quick lookup
  const targetWordMap = new Map(
    targetWords.map(w => [w.baseForm.toLowerCase(), w])
  )

  let currentPosition = 0
  const cleanText = learningText.replace(/[^\w\sÄÖÜäöüß]/g, ' ')
  const textWords = cleanText.split(/\s+/).filter(w => w.length > 0)

  for (const word of textWords) {
    const cleanWord = word.toLowerCase()
    const targetWord = targetWordMap.get(cleanWord)
    
    // Find actual position in original text
    const startPos = learningText.toLowerCase().indexOf(cleanWord, currentPosition)
    const endPos = startPos + word.length

    if (targetWord) {
      words.push({
        word: word,
        baseForm: targetWord.baseForm,
        translation: targetWord.translation,
        isTarget: true,
        position: { start: startPos, end: endPos },
        familiarity: targetWord.familiarity,
        showTranslation: !targetWord.isKnown && targetWord.practiceCount < 3,
        type: targetWord.type
      })
    } else {
      words.push({
        word: word,
        baseForm: word,
        isTarget: false,
        position: { start: startPos, end: endPos },
        familiarity: 'unknown',
        showTranslation: false
      })
    }

    currentPosition = endPos
  }

  return {
    words,
    sentences: sentences.map(s => s.trim())
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

    // Get user's language settings for response
    const languageSettings = await getUserLanguageSettings(session.user.id)

    return NextResponse.json({
      success: true,
      availableStyles: [
        { id: 'story', name: 'Story', description: 'Engaging narratives with character development' },
        { id: 'dialogue-2', name: '2-Person Dialogue', description: 'Conversation between two people' },
        { id: 'dialogue-3', name: '3-Person Dialogue', description: 'Three-way conversation' },
        { id: 'dialogue-4', name: '4-Person Dialogue', description: 'Group discussion with four people' },
        { id: 'article', name: 'Article', description: 'Informative texts about topics' }
      ],
      availableCategories: [
        { id: 'VERB', name: 'Verbs', description: 'Action words and conjugations' },
        { id: 'NOUN', name: 'Nouns', description: 'People, places, things' },
        { id: 'ADJ', name: 'Adjectives', description: 'Descriptive words' },
        { id: 'ADVERB', name: 'Adverbs', description: 'Modifying words' }
      ],
      availableTenses: [
        { id: 'present', name: 'Present (Präsens)' },
        { id: 'past', name: 'Simple Past (Präteritum)' },
        { id: 'perfect', name: 'Present Perfect (Perfekt)' },
        { id: 'pluperfect', name: 'Past Perfect (Plusquamperfekt)' },
        { id: 'future', name: 'Future (Futur I)' },
        { id: 'mixed', name: 'Mixed Tenses' }
      ],
      supportedLevels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      maxWordsPerCategory: 20,
      minWordsPerCategory: 1,
      userLanguageSettings: languageSettings,
      generationEngine: 'gemini-flash-2.5'
    })

  } catch (error) {
    console.error('Error fetching enhanced content generation info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content generation info' },
      { status: 500 }
    )
  }
}