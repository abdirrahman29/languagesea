// API route to generate AI practice content with target words
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createTranslator } from '@/lib/translator'
import type { WordTarget } from '@/lib/practice-engine'

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

    const translator = createTranslator()

    // Generate content using AI
    const generatedContent = await generatePracticeContent({
      targetWords,
      theme,
      style,
      userLevel,
      difficulty,
      length,
      translator
    })

    // Parse the generated content and identify word positions
    const parsedContent = await parseContentWithWordPositions(
      generatedContent.german,
      targetWords
    )

    const response = {
      sessionId,
      content: {
        german: generatedContent.german,
        english: generatedContent.english,
        words: parsedContent.words,
        sentences: parsedContent.sentences
      },
      metadata: {
        wordCount: parsedContent.words.length,
        targetWordsUsed: parsedContent.words.filter(w => w.isTarget).length,
        difficultyScore: calculateDifficultyScore(parsedContent.words),
        estimatedReadingTime: Math.ceil(generatedContent.german.split(' ').length / 150)
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

// FIXED: Generate content using AI with specific target words
async function generatePracticeContent({
  targetWords,
  theme,
  style,
  userLevel,
  difficulty,
  length,
  translator
}: {
  targetWords: WordTarget[]
  theme: string
  style: string
  userLevel: string
  difficulty: string
  length: number
  translator: any
}) {
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
  const lengthInstructions = `Length: ${length} words` 
  const prompt = `${stylePrompt} in German about "${theme}" for ${userLevel} level learners.

  MANDATORY REQUIREMENTS:
  - Must include ALL these target words naturally: ${targetWordsList}
  - ${difficultyInstructions}
  - ${lengthInstructions}
  - Make the context clear so word meanings are obvious
  - The text must be about the theme of "${theme}".
  - Use these familiar words when possible: ${knownWords}
  
  Additional guidelines:
  - Create a coherent, engaging narrative
  - Use target words in contexts that make their meaning clear
  - Ensure natural German grammar and flow
  - Level-appropriate vocabulary and structures
  
  Write ONLY the German text, no explanations or formatting.`

  try {
    // Use the new generateContent method instead of translate
    const germanText = await translator.generateContent(prompt)
    
    // Generate English translation
    const englishText = await translator.translate(germanText, { from: 'de', to: 'en' })

    return {
      german: germanText,
      english: englishText
    }
  } catch (error) {
    console.error('Error with AI content generation:', error)
    
    // Fallback content
    return {
      german: `Ein kurzer Text über ${theme}. Hier sind einige wichtige Wörter: ${targetWordsList}. Dies ist ein Beispieltext für Übungszwecke.`,
      english: `A short text about ${theme}. Here are some important words: ${targetWordsList}. This is an example text for practice purposes.`
    }
  }
}

// Parse content and identify word positions
async function parseContentWithWordPositions(
  germanText: string,
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

  const sentences = germanText.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  // Create a map of target words for quick lookup
  const targetWordMap = new Map(
    targetWords.map(w => [w.baseForm.toLowerCase(), w])
  )

  let currentPosition = 0
  const cleanText = germanText.replace(/[^\w\säöüßÄÖÜ]/g, ' ')
  const textWords = cleanText.split(/\s+/).filter(w => w.length > 0)

  for (const word of textWords) {
    const cleanWord = word.toLowerCase()
    const targetWord = targetWordMap.get(cleanWord)
    
    // Find actual position in original text
    const startPos = germanText.toLowerCase().indexOf(cleanWord, currentPosition)
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

    return NextResponse.json({
      success: true,
      availableStyles: [
        { id: 'story', name: 'Story', description: 'Engaging narratives with characters and plot' },
        { id: 'conversation', name: 'Conversation', description: 'Natural dialogues between people' },
        { id: 'article', name: 'Article', description: 'Informative texts about topics' }
      ],
      supportedLevels: ['A1', 'A2', 'B1', 'B2'],
      maxWords: 200,
      minWords: 100
    })

  } catch (error) {
    console.error('Error fetching content generation info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content generation info' },
      { status: 500 }
    )
  }
}