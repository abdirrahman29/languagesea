// text-actions.ts - Server actions for saving processed text with complete word type support
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

    // Process verbs
    for (const verb of textData.extractedWords.verbs) {
      const wordKey = `VERB:${verb.baseForm.toLowerCase()}`
      if (processedWords.has(wordKey)) continue
      processedWords.add(wordKey)

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
        verb.isNew = false
      } else if (verb.isNew) {
        try {
          const newVerb = await prisma.verb.create({
            data: {
              baseForm: verb.baseForm,
              level: verb.level,
              dateAdded: new Date(),
            },
          })
          existingVerbId = newVerb.id
        } catch (error) {
          console.error("Error creating verb:", error)
        }
      }

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
            isKnown: verb.isKnown || false,
            isRepeat: verb.isRepeat || false,
            sentence: verb.sentence || "",
            sentenceTranslation: verb.sentenceTranslation || "",
            verbId: existingVerbId,
          },
        }),
      )
    }

    // Process nouns
    for (const noun of textData.extractedWords.nouns) {
      const wordKey = `NOUN:${noun.baseForm.toLowerCase()}`
      if (processedWords.has(wordKey)) continue
      processedWords.add(wordKey)

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
        noun.isNew = false
      } else if (noun.isNew) {
        try {
          const newNoun = await prisma.noun.create({
            data: {
              baseForm: noun.baseForm,
              level: noun.level,
              gender: noun.gender === "unknown" ? null : noun.gender,
              dateAdded: new Date(),
            },
          })
          existingNounId = newNoun.id
        } catch (error) {
          console.error("Error creating noun:", error)
        }
      }

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
            isKnown: noun.isKnown || false,
            isRepeat: noun.isRepeat || false,
            sentence: noun.sentence || "",
            sentenceTranslation: noun.sentenceTranslation || "",
            nounId: existingNounId,
          },
        }),
      )
    }

    // Process adjectives
    for (const adjective of textData.extractedWords.adjectives) {
      const wordKey = `ADJ:${adjective.baseForm.toLowerCase()}`
      if (processedWords.has(wordKey)) continue
      processedWords.add(wordKey)

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
        adjective.isNew = false
      } else if (adjective.isNew) {
        try {
          const newAdjective = await prisma.adjective.create({
            data: {
              baseForm: adjective.baseForm,
              level: adjective.level,
              dateAdded: new Date(),
            },
          })
          existingAdjectiveId = newAdjective.id
        } catch (error) {
          console.error("Error creating adjective:", error)
        }
      }

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
            isKnown: adjective.isKnown || false,
            isRepeat: adjective.isRepeat || false,
            sentence: adjective.sentence || "",
            sentenceTranslation: adjective.sentenceTranslation || "",
            adjectiveId: existingAdjectiveId,
          },
        }),
      )
    }

    // Process adverbs
    for (const adverb of textData.extractedWords.adverbs) {
      const wordKey = `ADVERB:${adverb.baseForm.toLowerCase()}`
      if (processedWords.has(wordKey)) continue
      processedWords.add(wordKey)

      let existingAdverbId = null
      const existingAdverb = await prisma.adverb.findFirst({
        where: {
          baseForm: {
            equals: adverb.baseForm,
            mode: "insensitive",
          },
        },
      })

      if (existingAdverb) {
        existingAdverbId = existingAdverb.id
        adverb.isNew = false
      } else if (adverb.isNew) {
        try {
          const newAdverb = await prisma.adverb.create({
            data: {
              baseForm: adverb.baseForm,
              level: adverb.level,
              type: adverb.type || "other",
              dateAdded: new Date(),
            },
          })
          existingAdverbId = newAdverb.id
        } catch (error) {
          console.error("Error creating adverb:", error)
        }
      }

      wordPromises.push(
        prisma.extractedWord.create({
          data: {
            savedTextId: savedText.id,
            baseForm: adverb.baseForm,
            originalForm: adverb.originalForm,
            type: "ADVERB",
            level: adverb.level,
            translation: adverb.translation,
            isNew: adverb.isNew,
            isKnown: adverb.isKnown || false,
            isRepeat: adverb.isRepeat || false,
            sentence: adverb.sentence || "",
            sentenceTranslation: adverb.sentenceTranslation || "",
            adverbId: existingAdverbId,
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