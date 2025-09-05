// Fixed text-processor.ts - Added proper validation and error handling
import type { ProcessingResult } from "./types"
import { createTranslator } from "@/lib/translator"
import { prisma } from "@/lib/db"

// Simple tokenizer function to split text into words and sentences
function tokenizeText(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  return sentences.map((sentence) => {
    const trimmedSentence = sentence.trim()
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

// Map AI word types to our standardized types
function normalizeWordType(aiWordType: string): 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB' {
  const type = aiWordType.toUpperCase()
  
  switch (type) {
    case 'VERB':
      return 'VERB'
    case 'NOUN':
      return 'NOUN'
    case 'ADJECTIVE':
      return 'ADJ'
    case 'ADVERB':
      return 'ADVERB'
    case 'PREPOSITION':
    case 'CONJUNCTION':  
    case 'PRONOUN':
    case 'ARTICLE':
    case 'DETERMINER':
    case 'INTERJECTION':
    default:
      return 'ADVERB'
  }
}

async function checkWordInDatabase(userId: string, baseForm: string, type: 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB', languageCode: string) {
  // Add validation
  if (!userId || !baseForm || !type || !languageCode) {
    console.warn('Invalid parameters for checkWordInDatabase:', { userId, baseForm, type, languageCode })
    return false
  }

  try {
    const [practiced, extracted] = await Promise.all([
      prisma.practicedWord.findFirst({
        where: {
          userId,
          baseForm,
          type,
          languageCode
        }
      }),
      prisma.extractedWord.findFirst({
        where: {
          savedText: {
            userId
          },
          baseForm,
          type,
          languageCode
        }
      })
    ])

    return practiced || extracted ? true : false
  } catch (error) {
    console.error('Error checking word in database:', error)
    return false
  }
}

// Get user's language settings with proper validation
async function getUserLanguageSettings(userId: string) {
  // Validate userId parameter
  if (!userId || typeof userId !== 'string') {
    console.error('Invalid userId provided to getUserLanguageSettings:', userId)
    throw new Error('Valid userId is required')
  }

  try {
    console.log('Getting language settings for userId:', userId)
    
    const languageSettings = await prisma.languageSettings.findUnique({
      where: { userId }
    })

    if (languageSettings) {
      console.log('Found language settings:', languageSettings)
      return {
        languageCode: languageSettings.languageCode,
        translationCode: languageSettings.translationCode,
        learningLanguage: languageSettings.learningLanguage,
        nativeLanguage: languageSettings.nativeLanguage,
        includeConjugations: languageSettings.includeConjugations,
        includeCases: languageSettings.includeCases,
        includeGender: languageSettings.includeGender
      }
    }

    console.log('No language settings found, checking user table')
    
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

    if (!user) {
      console.error('User not found with id:', userId)
      throw new Error(`User not found with id: ${userId}`)
    }

    console.log('Found user settings:', user)
    
    return {
      languageCode: user.languageCode || 'de',
      translationCode: user.translationCode || 'en',
      learningLanguage: user.learningLanguage || 'German',
      nativeLanguage: user.nativeLanguage || 'English',
      includeConjugations: true,
      includeCases: true,
      includeGender: true
    }
  } catch (error) {
    console.error('Error getting user language settings:', error)
    
    // Return safe defaults only as last resort
    console.log('Using default language settings due to error')
    return {
      languageCode: 'de',
      translationCode: 'en',
      learningLanguage: 'German',
      nativeLanguage: 'English',
      includeConjugations: true,
      includeCases: true,
      includeGender: true
    }
  }
}

// Enhanced function to save verb conjugations with language awareness
async function saveVerbConjugations(verbId: number, baseForm: string, languageCode: string) {
  try {
    console.log(`Getting conjugations for ${languageCode.toUpperCase()} verb: ${baseForm} (ID: ${verbId})`)
    
    const translator = createTranslator(languageCode)
    const conjugationData = await translator.getVerbConjugations(baseForm)
    
    if (!conjugationData?.conjugations) {
      console.log(`No conjugations found for ${baseForm} in ${languageCode}`)
      return false
    }

    // Clear existing conjugations for this verb
    await prisma.verbConjugation.deleteMany({
      where: { verbId }
    })

    const conjugationRecords = []
    const conjugations = conjugationData.conjugations

    // Helper function to safely add conjugation records
    const addConjugationRecord = (tense: string, mood: string, number: string, person: string, form: string) => {
      if (form && form.trim()) {
        conjugationRecords.push({
          verbId,
          tense,
          mood,
          number,
          person,
          form: form.trim(),
          formId: null
        })
      }
    }

    // Process all tense/mood combinations
    for (const [tense, tenseData] of Object.entries(conjugations)) {
      if (typeof tenseData === 'object' && tenseData !== null) {
        for (const [mood, moodData] of Object.entries(tenseData)) {
          if (typeof moodData === 'object' && moodData !== null) {
            for (const [number, numberData] of Object.entries(moodData)) {
              if (typeof numberData === 'object' && numberData !== null) {
                for (const [person, personData] of Object.entries(numberData)) {
                  if (personData && typeof personData === 'object' && (personData as any).form) {
                    addConjugationRecord(tense, mood, number, person, (personData as any).form)
                  }
                }
              }
            }
          }
        }
      }
    }

    // Save all conjugations in a single transaction
    if (conjugationRecords.length > 0) {
      await prisma.verbConjugation.createMany({
        data: conjugationRecords,
        skipDuplicates: true
      })
      console.log(`✅ Successfully saved ${conjugationRecords.length} conjugation forms for ${languageCode} verb ${baseForm}`)
      return true
    } else {
      console.log(`⚠️ No valid conjugation forms found for ${languageCode} verb ${baseForm}`)
      return false
    }

  } catch (error) {
    console.error(`❌ Error saving conjugations for ${languageCode} verb ${baseForm}:`, error)
    return false
  }
}

async function createOrFindThemes(extractedThemes: any[], languageCode: string): Promise<string[]> {
  const themeIds: string[] = []
  
  for (const theme of extractedThemes) {
    try {
      let existingTheme = await prisma.themeCategory.findFirst({
        where: {
          name: {
            contains: theme.name,
            mode: 'insensitive'
          },
          languageCode
        }
      })
      
      if (!existingTheme) {
        existingTheme = await prisma.themeCategory.create({
          data: {
            name: theme.name,
            description: theme.description,
            language: theme.language || 'German',
            languageCode
          }
        })
        console.log(`Created new ${languageCode} theme: ${theme.name}`)
      }
      
      themeIds.push(existingTheme.id)
    } catch (error) {
      console.error(`Error creating/finding theme ${theme.name}:`, error)
    }
  }
  
  return themeIds
}

// Function to add words to themes with language awareness
async function addWordToThemes(word: any, themes: string[], createdThemeIds: string[], languageCode: string) {
  if (!themes || themes.length === 0 || themes.includes("General")) {
    return
  }
  
  try {
    for (const themeName of themes) {
      const theme = await prisma.themeCategory.findFirst({
        where: {
          name: {
            contains: themeName,
            mode: 'insensitive'
          },
          languageCode
        }
      })
      
      if (theme) {
        const existingWord = await prisma.themeCategoryWord.findFirst({
          where: {
            themeCategoryId: theme.id,
            text: word.baseForm,
            type: word.type,
            languageCode
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
              gender: word.gender || null,
              language: word.language || 'German',
              languageCode
            }
          })
          console.log(`Added ${languageCode} word "${word.baseForm}" to theme "${themeName}"`)
        }
      }
    }
  } catch (error) {
    console.error(`Error adding ${languageCode} word ${word.baseForm} to themes:`, error)
  }
}

const currentTextWordMap = new Map<string, number>()

// Enhanced function to process text with dynamic language support and validation
export async function processText(text: string, title: string, userId: string): Promise<ProcessingResult> {
  // Validate input parameters
  if (!text || typeof text !== 'string') {
    throw new Error('Valid text is required')
  }
  
  if (!title || typeof title !== 'string') {
    throw new Error('Valid title is required')
  }
  
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required')
  }

  console.log('processText called with:', { textLength: text.length, title, userId })
  
  currentTextWordMap.clear()

  try {
    // Get user's language settings with validation
    const languageSettings = await getUserLanguageSettings(userId)
    const { languageCode, translationCode, learningLanguage, includeConjugations } = languageSettings

    console.log(`Processing ${learningLanguage} text with language code: ${languageCode}`)

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
        newAdverbs: 0,
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
      themes: []
    }

    const processedWords: Record<string, Record<string, number>> = {
      VERB: {},
      NOUN: {},
      ADJ: {},
      ADVERB: {},
    }

    result.stats.totalWords = tokenizedSentences.reduce((count, sentence) => count + sentence.words.length, 0)

    // Create translator with user's language settings
    const translator = createTranslator(languageCode, translationCode)

    // Extract themes from the text
    console.log(`Extracting themes from ${learningLanguage} text...`)
    const themeExtraction = await translator.extractThemes(text, title)
    result.themes = themeExtraction.themes
    console.log("Waiting 4 seconds to respect rate limits...")
    await new Promise(resolve => setTimeout(resolve, 4000))
    
    // Create or find existing themes in database
    const createdThemeIds = await createOrFindThemes(themeExtraction.themes, languageCode)
    
    console.log(`Identified ${learningLanguage} themes:`, result.themes.map(t => t.name).join(', '))

    // Use the language-aware batch analyzer
    console.log(`Processing ${tokenizedSentences.length} ${learningLanguage} sentences with optimized batching...`)
    
    const sentenceData = tokenizedSentences.map(sentence => ({
      text: sentence.text,
      words: sentence.words.filter(word => word && word.length > 0)
    }))
    console.log("Waiting 4 seconds before batch analysis...")
    await new Promise(resolve => setTimeout(resolve, 4000))

    const maxWordsPerBatch = 150
    const batchAnalysis = await translator.batchAnalyzeEntireText(
      sentenceData, 
      result.themes, 
      includeConjugations,
      maxWordsPerBatch
    )
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log(`${learningLanguage} batch analysis complete, processing ${batchAnalysis.sentences.length} sentences...`)

    // Process each sentence from the batch analysis
    for (let i = 0; i < tokenizedSentences.length; i++) {
      const sentence = tokenizedSentences[i]
      const sentenceAnalysis = batchAnalysis.sentences[i]

      if (!sentenceAnalysis) {
        console.warn(`No analysis found for ${learningLanguage} sentence ${i}: "${sentence.text}"`)
        continue
      }

      const processedSentence = {
        german: sentence.text, // Keep this field name for compatibility
        english: sentenceAnalysis.sentenceTranslation,
        words: [] as Array<{ baseForm: string; type: string }>,
      }

      // Process each word in the sentence
      for (const word of sentence.words) {
        if (!word) continue

        const analysis = sentenceAnalysis.words[word]
        if (!analysis) {
          console.log(`No analysis found for ${learningLanguage} word: "${word}"`)
          continue
        }

        const baseForm = analysis.baseForm
        const rawWordType = analysis.wordType
        const wordType = normalizeWordType(rawWordType)
        const level = analysis.level
        const translation = analysis.translation
        const themes = analysis.themes || ["General"]

        // Check if this word has already been processed in this text
        const currentCount = currentTextWordMap.get(baseForm) || 0
        const isRepeatInCurrentText = currentCount > 0
        currentTextWordMap.set(baseForm, currentCount + 1)

        // Check if word is known in database (language-aware)
        const isKnown = await checkWordInDatabase(userId, baseForm, wordType, languageCode)
        const isNew = !isKnown

        // Update the counter for this word
        processedWords[wordType][baseForm] = (processedWords[wordType][baseForm] || 0) + 1

        // Add word to themes if it's new and not a repeat
        if (isNew && !isRepeatInCurrentText) {
          await addWordToThemes({
            baseForm,
            type: wordType,
            level,
            translation,
            gender: analysis.grammaticalInfo?.gender,
            language: learningLanguage
          }, themes, createdThemeIds, languageCode)
        }

        // Update stats based on word type
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
              tense: analysis.grammaticalInfo?.tense || "unknown",
              translation,
              themes,
              isNew,
              isKnown,
              isRepeat: isRepeatInCurrentText,
              sentence: sentence.text,
              sentenceTranslation: processedSentence.english,
              conjugationHint: analysis.conjugationHint || undefined
            })
            break

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
              gender: analysis.grammaticalInfo?.gender || "unknown",
              case: analysis.grammaticalInfo?.case || "unknown",
              translation,
              themes,
              isNew,
              isKnown,
              isRepeat: isRepeatInCurrentText,
              sentence: sentence.text,
              sentenceTranslation: processedSentence.english,
            })
            break

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
              case: analysis.grammaticalInfo?.case || "unknown",
              translation,
              themes,
              isNew,
              isKnown,
              isRepeat: isRepeatInCurrentText,
              sentence: sentence.text,
              sentenceTranslation: processedSentence.english,
            })
            break

          case 'ADVERB':
          default:
            result.stats.adverbs++
            if (isNew && !isRepeatInCurrentText) {
              result.stats.newWords++
              result.stats.newAdverbs++
            } else if (!isNew) {
              result.stats.existingWords++
            }

            result.extractedWords.adverbs.push({
              baseForm,
              originalForm: word,
              level,
              type: analysis.grammaticalInfo?.adverbType || rawWordType.toLowerCase() || "other",
              translation,
              themes,
              isNew,
              isKnown,
              isRepeat: isRepeatInCurrentText,
              sentence: sentence.text,
              sentenceTranslation: processedSentence.english,
            })
            break
        }

        processedSentence.words.push({
          baseForm,
          type: wordType,
        })

        updateLevelStats(result.stats, level)
      }

      result.sentences.push(processedSentence)
    }

    console.log(`${learningLanguage} processing complete. Total stats:`, result.stats)
    console.log(`${learningLanguage} themes identified:`, result.themes?.map(t => t.name).join(', '))
    
    return result

  } catch (error) {
    console.error('Error in processText:', error)
    throw new Error(`Failed to process text: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

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

// Function to process text with progress updates (wrapper for compatibility)
export async function processGermanText(text: string, title: string, userId: string): Promise<ProcessingResult> {
  return processText(text, title, userId)
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

// Export the enhanced saveVerbConjugations function
export { saveVerbConjugations }