// Enhanced text-actions.ts - Added verb conjugation storage
"use server"

import { prisma } from "@/lib/db"
import { createTranslator } from "@/lib/translator"

// Helper function to save verb conjugations
async function saveVerbConjugations(verbId: number, baseForm: string) {
  try {
    console.log(`Getting conjugations for verb: ${baseForm} (ID: ${verbId})`)
    
    const translator = createTranslator()
    const conjugationData = await translator.getVerbConjugations(baseForm)
    
    if (!conjugationData.conjugations) {
      console.log(`No conjugations found for ${baseForm}`)
      return
    }

    // Clear existing conjugations for this verb
    await prisma.verbConjugation.deleteMany({
      where: { verbId }
    })

    const conjugationRecords = []
    const conjugations = conjugationData.conjugations

    // Process present tense
    if (conjugations.present) {
      // Present indicative
      if (conjugations.present.indicative) {
        for (const [number, persons] of Object.entries(conjugations.present.indicative)) {
          for (const [person, data] of Object.entries(persons as any)) {
            if (data && (data as any).form) {
              conjugationRecords.push({
                verbId,
                tense: "present",
                mood: "indicative", 
                number,
                person,
                form: (data as any).form,
                formId: null
              })
            }
          }
        }
      }

      // Present subjunctive
      if (conjugations.present.subjunctive) {
        for (const [number, persons] of Object.entries(conjugations.present.subjunctive)) {
          for (const [person, data] of Object.entries(persons as any)) {
            if (data && (data as any).form) {
              conjugationRecords.push({
                verbId,
                tense: "present",
                mood: "subjunctive",
                number,
                person,
                form: (data as any).form,
                formId: null
              })
            }
          }
        }
      }
    }

    // Process past tense
    if (conjugations.past) {
      // Past indicative
      if (conjugations.past.indicative) {
        for (const [number, persons] of Object.entries(conjugations.past.indicative)) {
          for (const [person, data] of Object.entries(persons as any)) {
            if (data && (data as any).form) {
              conjugationRecords.push({
                verbId,
                tense: "past",
                mood: "indicative",
                number,
                person,
                form: (data as any).form,
                formId: null
              })
            }
          }
        }
      }

      // Past subjunctive
      if (conjugations.past.subjunctive) {
        for (const [number, persons] of Object.entries(conjugations.past.subjunctive)) {
          for (const [person, data] of Object.entries(persons as any)) {
            if (data && (data as any).form) {
              conjugationRecords.push({
                verbId,
                tense: "past",
                mood: "subjunctive",
                number,
                person,
                form: (data as any).form,
                formId: null
              })
            }
          }
        }
      }
    }

    // Process imperative
    if (conjugations.imperative) {
      // Singular imperative (du)
      if (conjugations.imperative.SG && Array.isArray(conjugations.imperative.SG)) {
        conjugations.imperative.SG.forEach((form: any) => {
          if (form && form.form) {
            conjugationRecords.push({
              verbId,
              tense: "imperative",
              mood: "imperative",
              number: "SG",
              person: form.person || "2", // Usually 'du' form
              form: form.form,
              formId: null
            })
          }
        })
      }

      // Plural imperative (ihr, Sie)
      if (conjugations.imperative.PL && Array.isArray(conjugations.imperative.PL)) {
        conjugations.imperative.PL.forEach((form: any, index: number) => {
          if (form && form.form) {
            conjugationRecords.push({
              verbId,
              tense: "imperative",
              mood: "imperative", 
              number: "PL",
              person: form.person || (index === 0 ? "2" : "3"), // ihr vs Sie
              form: form.form,
              formId: null
            })
          }
        })
      }
    }

    // Save all conjugations
    if (conjugationRecords.length > 0) {
      await prisma.verbConjugation.createMany({
        data: conjugationRecords
      })
      console.log(`Successfully saved ${conjugationRecords.length} conjugation forms for verb ${baseForm} (ID: ${verbId})`)
    } else {
      console.log(`No valid conjugation forms found for verb ${baseForm} (ID: ${verbId})`)
    }

  } catch (error) {
    console.error(`Error saving conjugations for verb ${baseForm} (ID: ${verbId}):`, error)
  }
}

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
    const newVerbsForConjugation: Array<{ verbId: number; baseForm: string }> = []

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
        
        // Check if this verb has conjugations already
        const existingConjugations = await prisma.verbConjugation.findFirst({
          where: { verbId: existingVerb.id }
        })
        
        // If no conjugations exist, add to the list for conjugation processing
        if (!existingConjugations) {
          newVerbsForConjugation.push({ 
            verbId: existingVerb.id, 
            baseForm: verb.baseForm 
          })
        }
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
          
          // Add new verb to conjugation processing list
          newVerbsForConjugation.push({ 
            verbId: newVerb.id, 
            baseForm: verb.baseForm 
          })
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

    // Process nouns (unchanged)
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

    // Process adjectives (unchanged)
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

    // Process adverbs (unchanged)
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

    // NEW: Process verb conjugations after all words are saved
    console.log(`Processing conjugations for ${newVerbsForConjugation.length} verbs...`)
    
    // Process conjugations in batches to avoid overwhelming the API
    const CONJUGATION_BATCH_SIZE = 3
    for (let i = 0; i < newVerbsForConjugation.length; i += CONJUGATION_BATCH_SIZE) {
      const batch = newVerbsForConjugation.slice(i, i + CONJUGATION_BATCH_SIZE)
      
      // Process conjugations in parallel for this batch
      await Promise.all(
        batch.map(({ verbId, baseForm }) => 
          saveVerbConjugations(verbId, baseForm)
        )
      )
      
      // Small delay between batches to respect API limits
      if (i + CONJUGATION_BATCH_SIZE < newVerbsForConjugation.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log("Text processing and conjugation storage completed successfully")
    return { success: true }
  } catch (error) {
    console.error("Error saving processed text:", error)
    return { success: false, error: "An error occurred while saving the text" }
  }
}