"use server"

import { prisma } from "@/lib/db"

export async function saveProcessedTextAction(userId: string, textData: any) {
  try {
    // Create the saved text
    const savedText = await prisma.savedText.create({
      data: {
        userId,
        title: textData.title,
        content: textData.content,
        level: textData.level || "A1",
        excerpt: textData.excerpt || textData.content.substring(0, 100),
        wordCount: textData.stats.totalWords,
        readingTime: Math.ceil(textData.stats.totalWords / 200), // Rough estimate
        stats: {
          create: {
            totalWords: textData.stats.totalWords,
            verbs: textData.stats.verbs,
            nouns: textData.stats.nouns,
            adjectives: textData.stats.adjectives,
            adverbs: textData.stats.adverbs,
            newWords: textData.stats.newWords,
            practicedWords: textData.stats.practicedWords || 0,
            knownFromOtherTexts: textData.stats.knownFromOtherTexts || 0,
            levelA1: textData.stats.levelA1,
            levelA2: textData.stats.levelA2,
            levelB1: textData.stats.levelB1,
            levelB2Plus: textData.stats.levelB2Plus,
          },
        },
      },
    })

    // Process and save extracted words
    const wordPromises = []

    // Track unique words in this text to avoid duplicates
    const processedWords = new Set<string>()

    // Process verbs - with improved handling to avoid duplicates
    for (const verb of textData.extractedWords.verbs) {
      // Create a unique identifier for this word
      const wordKey = `VERB:${verb.baseForm.toLowerCase()}`

      // Skip if we've already processed this word
      if (processedWords.has(wordKey)) {
        continue
      }

      processedWords.add(wordKey)

      // First, check if this verb already exists in the database
      let existingVerbId = null
      const existingVerb = await prisma.verb.findFirst({
        where: {
          baseForm: {
            equals: verb.baseForm,
            mode: "insensitive",
          },
        },
      })

      if (existingVerb) {
        existingVerbId = existingVerb.id
        // Update isNew flag since we found it in the database
        verb.isNew = false
      } else if (verb.isNew) {
        try {
          // Only create a new verb if it's marked as new and doesn't exist
          const newVerb = await prisma.verb.create({
            data: {
              id: Math.floor(Math.random() * 1000000) + 1, // Generate a random ID
              baseForm: verb.baseForm,
              level: verb.level,
              dateAdded: new Date(),
            },
          })
          existingVerbId = newVerb.id
        } catch (error) {
          console.error("Error creating verb:", error)
          // If we can't create the verb, we'll just continue without linking it
        }
      }

      // Create the extracted word entry
      wordPromises.push(
        prisma.extractedWord.create({
          data: {
            savedTextId: savedText.id,
            baseForm: verb.baseForm,
            originalForm: verb.originalForm,
            type: "VERB",
            level: verb.level,
            tense: verb.tense,
            translation: verb.translation,
            isNew: verb.isNew,
            sentence: verb.sentence || "",
            sentenceTranslation: verb.sentenceTranslation || "",
            verbId: existingVerbId,
          },
        }),
      )
    }

    // Process nouns with the same pattern
    for (const noun of textData.extractedWords.nouns) {
      // Create a unique identifier for this word
      const wordKey = `NOUN:${noun.baseForm.toLowerCase()}`

      // Skip if we've already processed this word
      if (processedWords.has(wordKey)) {
        continue
      }

      processedWords.add(wordKey)

      // First, check if this noun already exists in the database
      let existingNounId = null
      const existingNoun = await prisma.noun.findFirst({
        where: {
          baseForm: {
            equals: noun.baseForm,
            mode: "insensitive",
          },
        },
      })

      if (existingNoun) {
        existingNounId = existingNoun.id
        // Update isNew flag since we found it in the database
        noun.isNew = false
      } else if (noun.isNew) {
        try {
          // Only create a new noun if it's marked as new and doesn't exist
          const newNoun = await prisma.noun.create({
            data: {
              id: Math.floor(Math.random() * 1000000) + 1, // Generate a random ID
              baseForm: noun.baseForm,
              level: noun.level,
              dateAdded: new Date(),
            },
          })
          existingNounId = newNoun.id
        } catch (error) {
          console.error("Error creating noun:", error)
          // If we can't create the noun, we'll just continue without linking it
        }
      }

      // Create the extracted word entry
      wordPromises.push(
        prisma.extractedWord.create({
          data: {
            savedTextId: savedText.id,
            baseForm: noun.baseForm,
            originalForm: noun.originalForm,
            type: "NOUN",
            level: noun.level,
            gender: noun.gender,
            case: noun.case,
            translation: noun.translation,
            isNew: noun.isNew,
            sentence: noun.sentence || "",
            sentenceTranslation: noun.sentenceTranslation || "",
            nounId: existingNounId,
          },
        }),
      )
    }

    // Process adjectives with the same pattern
    for (const adjective of textData.extractedWords.adjectives) {
      // Create a unique identifier for this word
      const wordKey = `ADJ:${adjective.baseForm.toLowerCase()}`

      // Skip if we've already processed this word
      if (processedWords.has(wordKey)) {
        continue
      }

      processedWords.add(wordKey)

      // First, check if this adjective already exists in the database
      let existingAdjectiveId = null
      const existingAdjective = await prisma.adjective.findFirst({
        where: {
          baseForm: {
            equals: adjective.baseForm,
            mode: "insensitive",
          },
        },
      })

      if (existingAdjective) {
        existingAdjectiveId = existingAdjective.id
        // Update isNew flag since we found it in the database
        adjective.isNew = false
      } else if (adjective.isNew) {
        try {
          // Only create a new adjective if it's marked as new and doesn't exist
          const newAdjective = await prisma.adjective.create({
            data: {
              id: Math.floor(Math.random() * 1000000) + 1, // Generate a random ID
              baseForm: adjective.baseForm,
              level: adjective.level,
              dateAdded: new Date(),
            },
          })
          existingAdjectiveId = newAdjective.id
        } catch (error) {
          console.error("Error creating adjective:", error)
          // If we can't create the adjective, we'll just continue without linking it
        }
      }

      // Create the extracted word entry
      wordPromises.push(
        prisma.extractedWord.create({
          data: {
            savedTextId: savedText.id,
            baseForm: adjective.baseForm,
            originalForm: adjective.originalForm,
            type: "ADJ",
            level: adjective.level,
            case: adjective.case,
            translation: adjective.translation,
            isNew: adjective.isNew,
            sentence: adjective.sentence || "",
            sentenceTranslation: adjective.sentenceTranslation || "",
            adjectiveId: existingAdjectiveId,
          },
        }),
      )
    }

    // Process adverbs (these don't have a separate table)
    for (const adverb of textData.extractedWords.adverbs) {
      // Create a unique identifier for this word
      const wordKey = `ADV:${adverb.baseForm.toLowerCase()}`

      // Skip if we've already processed this word
      if (processedWords.has(wordKey)) {
        continue
      }

      processedWords.add(wordKey)

      wordPromises.push(
        prisma.extractedWord.create({
          data: {
            savedTextId: savedText.id,
            baseForm: adverb.baseForm,
            originalForm: adverb.originalForm,
            type: "ADV",
            level: adverb.level,
            translation: adverb.translation,
            isNew: adverb.isNew,
            sentence: adverb.sentence || "",
            sentenceTranslation: adverb.sentenceTranslation || "",
          },
        }),
      )
    }

    // Wait for all word creation promises to complete
    await Promise.all(wordPromises)

    return { success: true }
  } catch (error) {
    console.error("Error saving processed text:", error)
    return { success: false, error: "An error occurred while saving the text" }
  }
}
