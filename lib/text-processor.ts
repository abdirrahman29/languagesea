import type { ProcessingResult } from "./types"
import * as germanVerbData from "@/data/german_verb_conjugations.json"
import { createTranslator } from "@/lib/translator"
import { prisma } from "@/lib/db"

// Load German vocabulary data from JSON
const germanVocabulary = {
  verbs: {} as Record<string, any>,
  nouns: {} as Record<string, any>,
  adjectives: {} as Record<string, any>,
}

// Parse the JSON data
let vocabularyLoaded = false

async function loadVocabularyData() {
  if (vocabularyLoaded) return

  try {
    // In a real implementation with multiple files, we would load and merge them
    // For now, we'll parse the single JSON file we have

    // Process each entry in the JSON data
    Object.entries(germanVerbData).forEach(([word, data]) => {
      const wordData = data as any

      // Determine the type of word based on its properties
      if (wordData.present || wordData.past || wordData.imperative) {
        germanVocabulary.verbs[word] = wordData
      } else if (wordData.cases) {
        germanVocabulary.nouns[word] = wordData
      } else if (wordData.declensions || wordData.degrees) {
        germanVocabulary.adjectives[word] = wordData
      }
    })

    vocabularyLoaded = true
  } catch (error) {
    console.error("Error loading vocabulary data:", error)
    throw new Error("Failed to load vocabulary data")
  }
}

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
const currentTextWordMap = new Map<string, number>();

// Function to process German text
export async function processGermanText(text: string, title: string,userId: string): Promise<ProcessingResult> {
  await loadVocabularyData()
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
  }

  // Keep track of words already processed in this text
  const processedWords: Record<string, Record<string, number>> = {
    VERB: {},
    NOUN: {},
    ADJ: {},
    ADV: {},
  }

  // Count total words
  result.stats.totalWords = tokenizedSentences.reduce((count, sentence) => count + sentence.words.length, 0)

  // Process each sentence
  for (const sentence of tokenizedSentences) {
    const processedSentence = {
      german: sentence.text,
      english: await translateText(sentence.text),
      words: [] as Array<{ baseForm: string; type: string }>,
    }

    // Process each word in the sentence
    for (const word of sentence.words) {
      if (!word) continue
 
      // Check if it's a verb

      const verbMatch = findVerb(word)
      if (verbMatch) {
        result.stats.verbs++

        const baseForm = verbMatch.base_form

        // Check if this word has already been processed in this text
        const isRepeat = processedWords.VERB[baseForm] !== undefined
        const isKnown = await checkWordInDatabase(userId, baseForm, 'VERB')
        const currentCount = currentTextWordMap.get(baseForm) || 0;
    const isRepeatInCurrentText = currentCount > 0;
    currentTextWordMap.set(baseForm, currentCount + 1);
        const isNew = !isKnown
        

        // Update the counter for this word
        processedWords.VERB[baseForm] = (processedWords.VERB[baseForm] || 0) + 1

        // For client-side processing, assume all words are new initially
        // The server will determine if they're actually new when saving

        if (isNew && !isRepeatInCurrentText) {
          result.stats.newWords++
          result.stats.newVerbs++
          console.log(" verb", result.stats.newVerbs,word)

        }
        else  if ( isRepeatInCurrentText) {
          
          console.log(" verb", result.stats.newVerbs,word)

        }
        else {
          result.stats.existingWords++  // Add this line
          console.log(" exist", result.stats.existingWords,word)

        }
        
      // console.log(" result.stats.existingWords++", result.stats.existingWords)
        // Add to extracted verbs
        result.extractedWords.verbs.push({
          baseForm: verbMatch.base_form,
          originalForm: word,
          level: verbMatch.level,
          tense: determineTense(word, verbMatch),
          translation: await translateText(verbMatch.base_form),
          isNew: isNew ,
          // @ts-ignore
          isKnown: isKnown, 
          isRepeat: isRepeatInCurrentText,
          sentence: sentence.text,
          sentenceTranslation: await translateText(sentence.text),
        })

        // Add to sentence words
        processedSentence.words.push({
          baseForm: verbMatch.base_form,
          type: "VERB",
        })

        // Update level stats
        updateLevelStats(result.stats, verbMatch.level)

        continue
      }

      // Check if it's a noun
      const nounMatch = findNoun(word)
      if (nounMatch) {
        result.stats.nouns++

        const baseForm = nounMatch.base_form

        // Check if this word has already been processed in this text
        const isRepeat = processedWords.NOUN[baseForm] !== undefined

        // Update the counter for this word
        processedWords.NOUN[baseForm] = (processedWords.NOUN[baseForm] || 0) + 1

        // For client-side processing, assume all words are new initially

        // With this:
        const isKnown = await checkWordInDatabase(userId, baseForm, 'NOUN')
        const isNew = !isKnown
        
        if (isNew && !isRepeat) {
          result.stats.newWords++
          result.stats.newNouns++
        }
        else {
          result.stats.existingWords++  // Add this line
        }

        // Add to extracted nouns
        result.extractedWords.nouns.push({
          baseForm: nounMatch.base_form,
          originalForm: word,
          level: nounMatch.level,
          gender: determineGender(word, nounMatch),
          case: determineCase(word, nounMatch),
          translation: await translateText(nounMatch.base_form),
          isNew: isNew ,
          // @ts-ignore
          isKnown: isKnown, 
          sentence: sentence.text,
          sentenceTranslation: await translateText(sentence.text),
        })

        // Add to sentence words
        processedSentence.words.push({
          baseForm: nounMatch.base_form,
          type: "NOUN",
        })

        // Update level stats
        updateLevelStats(result.stats, nounMatch.level)

        continue
      }

      // Check if it's an adjective
      const adjectiveMatch = findAdjective(word)
      if (adjectiveMatch) {
        result.stats.adjectives++

        const baseForm = adjectiveMatch.base_form

        // Check if this word has already been processed in this text
        const isRepeat = processedWords.ADJ[baseForm] !== undefined

        // Update the counter for this word
        processedWords.ADJ[baseForm] = (processedWords.ADJ[baseForm] || 0) + 1

        // For client-side processing, assume all words are new initially

   
        
        // With this:
        const isKnown = await checkWordInDatabase(userId, baseForm, 'ADJ')
        
        const isNew = !isKnown
        
        if (isNew) {
          if (!isRepeat) {
            result.stats.newWords++
            result.stats.newAdjectives++
          }
        } else {
          result.stats.existingWords++
        }

        // Add to extracted adjectives
        result.extractedWords.adjectives.push({
          baseForm: adjectiveMatch.base_form,
          originalForm: word,
          level: adjectiveMatch.level,
          case: determineAdjectiveCase(word, adjectiveMatch),
          translation: await translateText(adjectiveMatch.base_form),
          isNew: isNew ,
          // @ts-ignore
          isKnown: isKnown, 
          sentence: sentence.text,
          sentenceTranslation: await translateText(sentence.text),
        })

        // Add to sentence words
        processedSentence.words.push({
          baseForm: adjectiveMatch.base_form,
          type: "ADJ",
        })

        // Update level stats
        updateLevelStats(result.stats, adjectiveMatch.level)

        continue
      }

      // If not found in our vocabulary, treat as unknown (likely adverb or other)
      result.stats.adverbs++

      const baseForm = word

      // Check if this word has already been processed in this text
      const isRepeat = processedWords.ADV[baseForm] !== undefined

      // Update the counter for this word
      processedWords.ADV[baseForm] = (processedWords.ADV[baseForm] || 0) + 1

      // Add to extracted adverbs
      result.extractedWords.adverbs.push({
        baseForm: word,
        originalForm: word,
        level: guessLevel(word),
        translation: await translateText(word),
        isNew: true,
        sentence: sentence.text,
        sentenceTranslation: await translateText(sentence.text),
      })

      // Add to sentence words
      processedSentence.words.push({
        baseForm: word,
        type: "ADV",
      })
    }

    // Add processed sentence to result
    result.sentences.push(processedSentence)
  }

  return result
}

// Helper function to find a verb in the vocabulary
function findVerb(word: string) {
  const wordLower = word.toLowerCase()

  // Check direct match
  if (germanVocabulary.verbs[wordLower]) {
    return germanVocabulary.verbs[wordLower]
  }

  // Check conjugated forms
  for (const [baseForm, verbData] of Object.entries(germanVocabulary.verbs)) {
    // Check present tense forms
    if (verbData.present) {
      for (const mood of Object.values(verbData.present)) {
        for (const number of Object.values(mood as any)) {
          for (const person of Object.values(number as any)) {
            if ((person as any).form === wordLower) {
              return verbData
            }
          }
        }
      }
    }

    // Check past tense forms
    if (verbData.past) {
      for (const mood of Object.values(verbData.past)) {
        for (const number of Object.values(mood as any)) {
          for (const person of Object.values(number as any)) {
            if ((person as any).form === wordLower) {
              return verbData
            }
          }
        }
      }
    }

    // Check imperative forms
    if (verbData.imperative) {
      for (const number of Object.values(verbData.imperative)) {
        for (const form of number as any) {
          if (form.form === wordLower) {
            return verbData
          }
        }
      }
    }
  }

  return null
}

// Helper function to find a noun in the vocabulary
function findNoun(word: string) {
  const wordLower = word.toLowerCase()

  // Check direct match
  if (germanVocabulary.nouns[wordLower]) {
    return germanVocabulary.nouns[wordLower]
  }

  // Check case forms
  for (const [baseForm, nounData] of Object.entries(germanVocabulary.nouns)) {
    if (nounData.cases) {
      for (const caseType of Object.values(nounData.cases)) {
        for (const gender of Object.values(caseType as any)) {
          for (const number of Object.values(gender as any)) {
            if ((number as any).form === wordLower) {
              return nounData
            }
          }
        }
      }
    }
  }

  return null
}

// Helper function to find an adjective in the vocabulary
function findAdjective(word: string) {
  const wordLower = word.toLowerCase()

  // Check direct match
  if (germanVocabulary.adjectives[wordLower]) {
    return germanVocabulary.adjectives[wordLower]
  }

  // Check declension forms
  for (const [baseForm, adjData] of Object.entries(germanVocabulary.adjectives)) {
    if (adjData.declensions) {
      for (const caseType of Object.values(adjData.declensions)) {
        for (const gender of Object.values(caseType as any)) {
          for (const number of Object.values(gender as any)) {
            if ((number as any).form === wordLower) {
              return adjData
            }
          }
        }
      }
    }
  }

  return null
}

// Helper function to determine verb tense
function determineTense(word: string, verbData: any) {
  const wordLower = word.toLowerCase()

  // Check present tense
  if (verbData.present) {
    for (const mood of Object.values(verbData.present)) {
      for (const number of Object.values(mood as any)) {
        for (const person of Object.values(number as any)) {
          if ((person as any).form === wordLower) {
            return "present"
          }
        }
      }
    }
  }

  // Check past tense
  if (verbData.past) {
    for (const mood of Object.values(verbData.past)) {
      for (const number of Object.values(mood as any)) {
        for (const person of Object.values(number as any)) {
          if ((person as any).form === wordLower) {
            return "past"
          }
        }
      }
    }
  }

  // If we can't determine the tense, return unknown
  return "unknown"
}

// Helper function to determine noun gender
function determineGender(word: string, nounData: any) {
  const wordLower = word.toLowerCase()

  if (!nounData.cases) return "unknown"

  // Check each case for gender information
  for (const caseType of Object.values(nounData.cases)) {
    for (const gender of Object.keys(caseType as any)) {
      for (const number of Object.values((caseType as any)[gender])) {
        if ((number as any).form === wordLower) {
          return gender
        }
      }
    }
  }

  return "unknown"
}

// Helper function to determine noun case
function determineCase(word: string, nounData: any) {
  const wordLower = word.toLowerCase()

  if (!nounData.cases) return "unknown"

  // Check each case
  for (const [caseType, genders] of Object.entries(nounData.cases)) {
    for (const gender of Object.values(genders as any)) {
      for (const number of Object.values(gender as any)) {
        if ((number as any).form === wordLower) {
          return caseType
        }
      }
    }
  }

  return "unknown"
}

// Helper function to determine adjective case
function determineAdjectiveCase(word: string, adjData: any) {
  const wordLower = word.toLowerCase()

  if (!adjData.declensions) return "unknown"

  // Check each case
  for (const [caseType, genders] of Object.entries(adjData.declensions)) {
    for (const gender of Object.values(genders as any)) {
      for (const number of Object.values(gender as any)) {
        if ((number as any).form === wordLower) {
          return caseType
        }
      }
    }
  }

  return "unknown"
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

// Helper function to guess the level of a word
function guessLevel(word: string) {
  // In a real implementation, this would use a more sophisticated approach
  // For now, we'll use word length as a simple heuristic
  const length = word.length

  if (length <= 4) {
    return "A1"
  } else if (length <= 6) {
    return "A2"
  } else if (length <= 8) {
    return "B1"
  } else {
    return "B2"
  }
}

// Helper function to translate German to English
async function translateText(text: string) {
  try {
    const translator = createTranslator()
    const translation = await translator.translate(text, { from: "de", to: "en" })
    console.log(" translating text:", translation)

    return translation
  } catch (error) {
    console.error("Error translating text:", error)
    return `[Translation of: ${text}]`
  }
}

// Function to process text with progress updates
export async function processText(
  text: string,
  title: string,
  onProgress: (progress: number, stats: any) => void,
): Promise<ProcessingResult> {
  // Simulate processing steps with progress updates
  onProgress(10, { verbs: 0, nouns: 0, adjectives: 0 })
  await new Promise((resolve) => setTimeout(resolve, 500))

  onProgress(30, { verbs: 0, nouns: 0, adjectives: 0 })
  await new Promise((resolve) => setTimeout(resolve, 500))

  onProgress(50, { verbs: 0, nouns: 0, adjectives: 0 })
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Process the text
  // @ts-ignore
  const result = await processGermanText(text, title,userId)

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
