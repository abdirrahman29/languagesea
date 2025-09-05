// Updated app/api/practice/generate-content/route.ts - Dynamic language support
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createTranslator } from '@/lib/translator'
import { prisma } from '@/lib/db'
import type { WordTarget } from '@/lib/practice-engine'

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
      targetWords, 
      theme, 
      style, 
      userLevel,
      difficulty,
      length
    }: {
      sessionId: string
      targetWords: WordTarget[]
      theme: string
      style: 'conversation' | 'article' | 'story'
      userLevel: string
      difficulty: 'easy' | 'medium' | 'hard'
      length: number
    } = body

    // Validate input
    if (!targetWords || !Array.isArray(targetWords) || targetWords.length === 0) {
      return NextResponse.json(
        { error: 'Target words are required' },
        { status: 400 }
      )
    }

    // Get user's language settings
    const languageSettings = await getUserLanguageSettings(session.user.id)
    const { languageCode, translationCode, learningLanguage, nativeLanguage } = languageSettings

    console.log(`Generating content for ${learningLanguage} (${languageCode}) with ${targetWords.length} target words`)

    const translator = createTranslator()

    // Generate content using AI with dynamic language support
    const generatedContent = await generatePracticeContent({
      targetWords,
      theme,
      style,
      userLevel,
      difficulty,
      length,
      translator,
      languageSettings
    })

    // Parse the generated content and identify word positions
    const parsedContent = await parseContentWithWordPositions(
      generatedContent.learningText,
      targetWords
    )

    const response = {
      sessionId,
      content: {
        [languageCode]: generatedContent.learningText, // Dynamic language field
        german: generatedContent.learningText, // Keep for backward compatibility
        [translationCode]: generatedContent.translationText, // Dynamic translation field
        english: generatedContent.translationText, // Keep for backward compatibility
        words: parsedContent.words,
        sentences: parsedContent.sentences
      },
      metadata: {
        wordCount: parsedContent.words.length,
        targetWordsUsed: parsedContent.words.filter(w => w.isTarget).length,
        difficultyScore: calculateDifficultyScore(parsedContent.words),
        estimatedReadingTime: Math.ceil(generatedContent.learningText.split(' ').length / 150),
        languageCode,
        translationCode,
        learningLanguage,
        nativeLanguage
      }
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Error generating practice content:', error)
    return NextResponse.json(
      { error: 'Failed to generate practice content' },
      { status: 500 }
    )
  }
}

// Enhanced content generation with dynamic language support
async function generatePracticeContent({
  targetWords,
  theme,
  style,
  userLevel,
  difficulty,
  length,
  translator,
  languageSettings
}: {
  targetWords: WordTarget[]
  theme: string
  style: string
  userLevel: string
  difficulty: string
  length: number
  translator: any
  languageSettings: any
}) {
  const { languageCode, translationCode, learningLanguage, nativeLanguage } = languageSettings
  
  const targetWordsList = targetWords.map(w => w.baseForm).join(', ')
  const knownWords = targetWords.filter(w => w.isKnown).map(w => w.baseForm).join(', ')
  
  let stylePrompt = ''
  switch (style) {
    case 'story':
      stylePrompt = 'Write an engaging short story'
      break
    case 'conversation':
      stylePrompt = 'Write a natural conversation between 2-3 people'
      break
    case 'article':
      stylePrompt = 'Write an informative article'
      break
  }

  let difficultyInstructions = ''
  switch (difficulty) {
    case 'easy':
      difficultyInstructions = 'Use simple sentence structures and common vocabulary'
      break
    case 'medium':
      difficultyInstructions = 'Use moderate complexity with some compound sentences'
      break
    case 'hard':
      difficultyInstructions = 'Use complex sentence structures and varied vocabulary'
      break
  }

  const lengthInstructions = `Length: approximately ${length} words`
  
  // Dynamic prompt based on learning language
  const prompt = `${stylePrompt} in ${learningLanguage} about "${theme}" for ${userLevel} level learners.

  MANDATORY REQUIREMENTS:
  - Must include ALL these target words naturally: ${targetWordsList}
  - ${difficultyInstructions}
  - ${lengthInstructions}
  - Make the context clear so word meanings are obvious
  - The text must be about the theme of "${theme}"
  - Use these familiar words when possible: ${knownWords}
  - Write in proper ${learningLanguage} with correct grammar and natural flow
  
  Additional guidelines:
  - Create a coherent, engaging narrative
  - Use target words in contexts that make their meaning clear
  - Ensure natural ${learningLanguage} grammar and flow
  - Level-appropriate vocabulary and structures for ${userLevel} learners
  - Make the content culturally appropriate and interesting
  
  Write ONLY the ${learningLanguage} text, no explanations or formatting.`

  try {
    console.log(`Generating ${learningLanguage} content...`)
    const learningText = await translator.generateContent(prompt)
    
    console.log(`Translating to ${nativeLanguage}...`)
    const translationText = await translator.translate(learningText, { 
      from: languageCode, 
      to: translationCode 
    })

    return {
      learningText,
      translationText
    }
  } catch (error) {
    console.error(`Error with AI content generation for ${learningLanguage}:`, error)
    
    // Fallback content with dynamic language
    const fallbackMap: Record<string, any> = {
      de: {
        text: `Ein kurzer Text über ${theme}. Hier sind einige wichtige Wörter: ${targetWordsList}. Dies ist ein Beispieltext für Übungszwecke.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      },
      es: {
        text: `Un texto corto sobre ${theme}. Aquí están algunas palabras importantes: ${targetWordsList}. Este es un texto de ejemplo para practicar.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      },
      fr: {
        text: `Un texte court sur ${theme}. Voici quelques mots importants: ${targetWordsList}. Ceci est un texte d'exemple à des fins de pratique.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      },
      it: {
        text: `Un testo breve su ${theme}. Ecco alcune parole importanti: ${targetWordsList}. Questo è un testo di esempio per la pratica.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      },
      pt: {
        text: `Um texto curto sobre ${theme}. Aqui estão algumas palavras importantes: ${targetWordsList}. Este é um texto de exemplo para prática.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      },
      tr: {
        text: `${theme} hakkında kısa bir metin. İşte bazı önemli kelimeler: ${targetWordsList}. Bu pratik amaçlı örnek bir metindir.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      },
      nl: {
        text: `Een korte tekst over ${theme}. Hier zijn enkele belangrijke woorden: ${targetWordsList}. Dit is een voorbeeldtekst voor oefening.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      },
      sv: {
        text: `En kort text om ${theme}. Här är några viktiga ord: ${targetWordsList}. Detta är en exempeltext för övning.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      },
      no: {
        text: `En kort tekst om ${theme}. Her er noen viktige ord: ${targetWordsList}. Dette er en eksempeltekst for øvelse.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      },
      da: {
        text: `En kort tekst om ${theme}. Her er nogle vigtige ord: ${targetWordsList}. Dette er en eksempeltekst til øvelse.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      },
      fi: {
        text: `Lyhyt teksti aiheesta ${theme}. Tässä on joitakin tärkeitä sanoja: ${targetWordsList}. Tämä on esimerkkiteksti harjoittelua varten.`,
        translation: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
      }
    }

    const fallback = fallbackMap[languageCode] || fallbackMap.de
    
    return {
      learningText: fallback.text,
      translationText: fallback.translation
    }
  }
}

// Parse content and identify word positions (language-agnostic)
async function parseContentWithWordPositions(
  learningText: string,
  targetWords: WordTarget[]
) {
  const words: Array<{
    word: string
    baseForm: string
    translation?: string
    isTarget: boolean
    position: { start: number; end: number }
    familiarity: string
    showTranslation: boolean
  }> = []

  const sentences = learningText.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  // Create a map of target words for quick lookup
  const targetWordMap = new Map(
    targetWords.map(w => [w.baseForm.toLowerCase(), w])
  )

  let currentPosition = 0
  // Language-agnostic character handling for multiple European languages
  const cleanText = learningText.replace(/[^\w\säöüßÄÖÜáéíóúñçàèéêëîïôùûüÿæøåğıİçşĞŞıÜÇİÖğüçşıöüÇĞIŞ]/g, ' ')
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
        showTranslation: !targetWord.isKnown && targetWord.practiceCount < 3
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

// Calculate content difficulty score
function calculateDifficultyScore(words: any[]): number {
  const targetWords = words.filter(w => w.isTarget)
  const unknownCount = targetWords.filter(w => w.familiarity === 'unknown').length
  const learningCount = targetWords.filter(w => w.familiarity === 'learning').length
  
  const unknownRatio = unknownCount / Math.max(targetWords.length, 1)
  const learningRatio = learningCount / Math.max(targetWords.length, 1)
  
  // Score from 1-10 (10 being hardest)
  return Math.round(
    (unknownRatio * 6) + (learningRatio * 3) + 1
  )
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
        { id: 'story', name: 'Story', description: 'Engaging narratives with characters and plot' },
        { id: 'conversation', name: 'Conversation', description: 'Natural dialogues between people' },
        { id: 'article', name: 'Article', description: 'Informative texts about topics' }
      ],
      supportedLevels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      maxWords: 1500,
      minWords: 80,
      userLanguageSettings: languageSettings
    })

  } catch (error) {
    console.error('Error fetching content generation info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content generation info' },
      { status: 500 }
    )
  }
}