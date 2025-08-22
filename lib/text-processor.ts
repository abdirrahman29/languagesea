// text-processor.ts - AI-powered German text processor with batch analysis
import type { ProcessingResult } from "./types"
import { createTranslator } from "@/lib/translator"
import { prisma } from "@/lib/db"

// Simple tokenizer function to split text into words and sentences
function tokenizeText(text: string) {
  // Split text into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  // Process each sentence
  return sentences.map((sentence) => {
    const trimmedSentence = sentence.trim()
    // Split sentence into words, removing punctuation
    const words = trimmedSentence
      .split(/\s+/)
      .map((word) => word.replace(/[.,!?;:()]/g, "").toLowerCase())
      .filter((word) => word.length > 0)

    return {
      text: trimmedSentence,
      words,
    }
  })
}

// Map Gemini word types to our standardized types
function normalizeWordType(geminiWordType: string): 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB' {
  const type = geminiWordType.toUpperCase()
  
  switch (type) {
    case 'VERB':
      return 'VERB'
    case 'NOUN':
      return 'NOUN'
    case 'ADJECTIVE':
      return 'ADJ'
    case 'ADVERB':
      return 'ADVERB'
    // Map other types to closest equivalent or default to ADVERB
    case 'PREPOSITION':
    case 'CONJUNCTION':  
    case 'PRONOUN':
    case 'ARTICLE':
    case 'DETERMINER':
    case 'INTERJECTION':
    default:
      return 'ADVERB' // Default fallback for unhandled types
  }
}

async function checkWordInDatabase(userId: string, baseForm: string, type: 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB') {
  // Check both PracticedWord and ExtractedWord tables
  const [practiced, extracted] = await Promise.all([
    prisma.practicedWord.findFirst({
      where: {
        userId,
        baseForm,
        type
      }
    }),
    prisma.extractedWord.findFirst({
      where: {
        savedText: {
          userId
        },
        baseForm,
        type
      }
    })
  ])

  return practiced || extracted ? true : false
}
async function createOrFindThemes(extractedThemes: any[]): Promise<string[]> {
  const themeIds: string[] = []
  
  for (const theme of extractedThemes) {
    try {
      // Try to find existing theme with similar name
      let existingTheme = await prisma.themeCategory.findFirst({
        where: {
          name: {
            contains: theme.name,
            mode: 'insensitive'
          }
        }
      })
      
      // If not found, create new theme
      if (!existingTheme) {
        existingTheme = await prisma.themeCategory.create({
          data: {
            name: theme.name,
            description: theme.description
          }
        })
        console.log(`Created new theme: ${theme.name}`)
      }
      
      themeIds.push(existingTheme.id)
    } catch (error) {
      console.error(`Error creating/finding theme ${theme.name}:`, error)
    }
  }
  
  return themeIds
}

// NEW: Function to add words to themes automatically
async function addWordToThemes(word: any, themes: string[], createdThemeIds: string[]) {
  if (!themes || themes.length === 0 || themes.includes("General")) {
    return // Skip general or undefined themes
  }
  
  try {
    for (const themeName of themes) {
      // Find the theme by name
      const theme = await prisma.themeCategory.findFirst({
        where: {
          name: {
            contains: themeName,
            mode: 'insensitive'
          }
        }
      })
      
      if (theme) {
        // Check if word already exists in this theme
        const existingWord = await prisma.themeCategoryWord.findFirst({
          where: {
            themeCategoryId: theme.id,
            text: word.baseForm,
            type: word.type
          }
        })
        
        if (!existingWord) {
          await prisma.themeCategoryWord.create({
            data: {
              themeCategoryId: theme.id,
              text: word.baseForm,
              type: word.type,
              level: word.level || "A2",
              translation: word.translation,
              gender: word.gender || null
            }
          })
          console.log(`Added word "${word.baseForm}" to theme "${themeName}"`)
        }
      }
    }
  } catch (error) {
    console.error(`Error adding word ${word.baseForm} to themes:`, error)
  }
}
const currentTextWordMap = new Map<string, number>();

// Function to process German text
export async function processGermanText(text: string, title: string, userId: string): Promise<ProcessingResult> {
  currentTextWordMap.clear();

  // Tokenize the text
  const tokenizedSentences = tokenizeText(text)

  // Initialize result structure
  const result: ProcessingResult = {
    stats: {
      totalWords: 0,
      verbs: 0,
      nouns: 0,
      adjectives: 0,
      adverbs: 0,
      newWords: 0,
      newVerbs: 0,
      newNouns: 0,
      newAdjectives: 0,
      existingWords: 0,
      levelA1: 0,
      levelA2: 0,
      levelB1: 0,
      levelB2Plus: 0,
    },
    extractedWords: {
      verbs: [],
      nouns: [],
      adjectives: [],
      adverbs: [],
    },
    sentences: [],
    themes: [] // NEW: Add themes to result
  }

  const processedWords: Record<string, Record<string, number>> = {
    VERB: {},
    NOUN: {},
    ADJ: {},
    ADVERB: {},
  }

  result.stats.totalWords = tokenizedSentences.reduce((count, sentence) => count + sentence.words.length, 0)

  const translator = createTranslator()

  // NEW: Extract themes from the text
  console.log("Extracting themes from text...")
  const themeExtraction = await translator.extractThemes(text, title)
  result.themes = themeExtraction.themes
  
  // Create or find existing themes in database
  const createdThemeIds = await createOrFindThemes(themeExtraction.themes)
  
  console.log("Identified themes:", result.themes.map(t => t.name).join(', '))

  // Batch process sentences
  const BATCH_SIZE = 5
  
  for (let i = 0; i < tokenizedSentences.length; i += BATCH_SIZE) {
    const sentenceBatch = tokenizedSentences.slice(i, i + BATCH_SIZE)
    
    const batchData = sentenceBatch.map(sentence => ({
      text: sentence.text,
      words: sentence.words.filter(word => word && word.length > 0)
    }))

    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(tokenizedSentences.length/BATCH_SIZE)}`)

    // Pass themes to the analysis for better categorization
    const batchAnalysis = await translator.batchAnalyzeText(batchData, result.themes)

    // Process each sentence in the batch
    for (let j = 0; j < sentenceBatch.length; j++) {
      const sentence = sentenceBatch[j]
      const sentenceAnalysis = batchAnalysis.sentences[j]

      const processedSentence = {
        german: sentence.text,
        english: sentenceAnalysis.sentenceTranslation,
        words: [] as Array<{ baseForm: string; type: string }>,
      }

      // Process each word in the sentence
      for (const word of sentence.words) {
        if (!word) continue

        const analysis = sentenceAnalysis.words[word]
        if (!analysis) {
          console.log(`No analysis found for word: "${word}"`)
          continue
        }

        const baseForm = analysis.baseForm
        const rawWordType = analysis.wordType
        const wordType = normalizeWordType(rawWordType)
        const level = analysis.level
        const translation = analysis.translation
        const themes = analysis.themes || ["General"] // NEW: Get themes

        // Check if this word has already been processed in this text
        const currentCount = currentTextWordMap.get(baseForm) || 0;
        const isRepeatInCurrentText = currentCount > 0;
        currentTextWordMap.set(baseForm, currentCount + 1);

        // Check if word is known in database
        const isKnown = await checkWordInDatabase(userId, baseForm, wordType)
        const isNew = !isKnown

        // Update the counter for this word
        processedWords[wordType][baseForm] = (processedWords[wordType][baseForm] || 0) + 1

        // NEW: Add word to themes if it's new and not a repeat
        if (isNew && !isRepeatInCurrentText) {
          await addWordToThemes({
            baseForm,
            type: wordType,
            level,
            translation,
            gender: analysis.grammaticalInfo?.gender
          }, themes, createdThemeIds)
        }

        // Update stats based on word type (existing logic)
        switch (wordType) {
          case 'VERB':
            result.stats.verbs++
            if (isNew && !isRepeatInCurrentText) {
              result.stats.newWords++
              result.stats.newVerbs++
            } else if (!isNew) {
              result.stats.existingWords++
            }

            result.extractedWords.verbs.push({
              baseForm,
              originalForm: word,
              level,
              tense: analysis.grammaticalInfo.tense || "unknown",
              translation,
              themes, // NEW: Add themes to extracted word
              isNew,
              isKnown,
              isRepeat: isRepeatInCurrentText,
              sentence: sentence.text,
              sentenceTranslation: processedSentence.english,
            })
            break;

          case 'NOUN':
            result.stats.nouns++
            if (isNew && !isRepeatInCurrentText) {
              result.stats.newWords++
              result.stats.newNouns++
            } else if (!isNew) {
              result.stats.existingWords++
            }

            result.extractedWords.nouns.push({
              baseForm,
              originalForm: word,
              level,
              gender: analysis.grammaticalInfo.gender || "unknown",
              case: analysis.grammaticalInfo.case || "unknown",
              translation,
              themes, // NEW: Add themes to extracted word
              isNew,
              isKnown,
              isRepeat: isRepeatInCurrentText,
              sentence: sentence.text,
              sentenceTranslation: processedSentence.english,
            })
            break;

          case 'ADJ':
            result.stats.adjectives++
            if (isNew && !isRepeatInCurrentText) {
              result.stats.newWords++
              result.stats.newAdjectives++
            } else if (!isNew) {
              result.stats.existingWords++
            }

            result.extractedWords.adjectives.push({
              baseForm,
              originalForm: word,
              level,
              case: analysis.grammaticalInfo.case || "unknown",
              translation,
              themes, // NEW: Add themes to extracted word
              isNew,
              isKnown,
              isRepeat: isRepeatInCurrentText,
              sentence: sentence.text,
              sentenceTranslation: processedSentence.english,
            })
            break;

          case 'ADVERB':
          default:
            result.stats.adverbs++
            if (isNew && !isRepeatInCurrentText) {
              result.stats.newWords++
            } else if (!isNew) {
              result.stats.existingWords++
            }

            result.extractedWords.adverbs.push({
              baseForm,
              originalForm: word,
              level,
              type: analysis.grammaticalInfo.adverbType || rawWordType.toLowerCase() || "other",
              translation,
              themes, // NEW: Add themes to extracted word
              isNew,
              isKnown,
              isRepeat: isRepeatInCurrentText,
              sentence: sentence.text,
              sentenceTranslation: processedSentence.english,
            })
            break;
        }

        processedSentence.words.push({
          baseForm,
          type: wordType,
        })

        updateLevelStats(result.stats, level)
      }

      result.sentences.push(processedSentence)
    }

    if (i + BATCH_SIZE < tokenizedSentences.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log(`Processing complete. Total stats:`, result.stats)
  console.log(`Themes identified:`, result.themes?.map(t => t.name).join(', '))
  return result
}

// ... (keep existing helper functi

// Helper function to update level statistics
function updateLevelStats(stats: any, level: string) {
  switch (level) {
    case "A1":
      stats.levelA1++
      break
    case "A2":
      stats.levelA2++
      break
    case "B1":
      stats.levelB1++
      break
    default:
      stats.levelB2Plus++
      break
  }
}

// Function to process text with progress updates
export async function processText(
  text: string,
  title: string,
  onProgress: (progress: number, stats: any) => void,
  userId: string // Add userId parameter
): Promise<ProcessingResult> {
  // Simulate processing steps with progress updates
  onProgress(10, { verbs: 0, nouns: 0, adjectives: 0 })
  await new Promise((resolve) => setTimeout(resolve, 500))

  onProgress(30, { verbs: 0, nouns: 0, adjectives: 0 })
  await new Promise((resolve) => setTimeout(resolve, 500))

  onProgress(50, { verbs: 0, nouns: 0, adjectives: 0 })
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Process the text
  const result = await processGermanText(text, title, userId)

  // Update progress with actual stats
  onProgress(80, {
    verbs: result.stats.verbs,
    nouns: result.stats.nouns,
    adjectives: result.stats.adjectives,
  })

  await new Promise((resolve) => setTimeout(resolve, 500))
  onProgress(100, result.stats)

  return result
}

// Function to save processed text via API
export async function saveProcessedTextAction(userId: string, textData: any) {
  try {
    const response = await fetch("/api/save-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        textData,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to save text" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error saving text:", error)
    return { success: false, error: "An error occurred while saving the text" }
  }
}