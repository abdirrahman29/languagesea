// Fixed text-actions.ts - Properly saving adverbs with debugging
"use server"

import { prisma } from "@/lib/db"
import { createTranslator } from "@/lib/translator"

// FIXED: Improved conjugation saving function with better error handling and structure
async function saveVerbConjugations(verbId: number, baseForm: string): Promise<boolean> {
  try {
    console.log(`🔄 Getting conjugations for verb: ${baseForm} (ID: ${verbId})`)
    
    const translator = createTranslator()
    const conjugationData = await translator.getVerbConjugations(baseForm)
    
    if (!conjugationData?.conjugations) {
      console.log(`⚠️ No conjugations data received for ${baseForm}`)
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
      if (form && typeof form === 'string' && form.trim()) {
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

    console.log(`📊 Processing conjugations structure:`, JSON.stringify(conjugations, null, 2))

    // Process present tense indicative
    if (conjugations.present?.indicative) {
      console.log(`Processing present indicative for ${baseForm}`)
      for (const [number, persons] of Object.entries(conjugations.present.indicative)) {
        if (persons && typeof persons === 'object') {
          for (const [person, data] of Object.entries(persons)) {
            const form = (data as any)?.form
            if (form) {
              addConjugationRecord("present", "indicative", number, person, form)
            }
          }
        }
      }
    }

    // Process present tense subjunctive
    if (conjugations.present?.subjunctive) {
      console.log(`Processing present subjunctive for ${baseForm}`)
      for (const [number, persons] of Object.entries(conjugations.present.subjunctive)) {
        if (persons && typeof persons === 'object') {
          for (const [person, data] of Object.entries(persons)) {
            const form = (data as any)?.form
            if (form) {
              addConjugationRecord("present", "subjunctive", number, person, form)
            }
          }
        }
      }
    }

    // Process past tense indicative
    if (conjugations.past?.indicative) {
      console.log(`Processing past indicative for ${baseForm}`)
      for (const [number, persons] of Object.entries(conjugations.past.indicative)) {
        if (persons && typeof persons === 'object') {
          for (const [person, data] of Object.entries(persons)) {
            const form = (data as any)?.form
            if (form) {
              addConjugationRecord("past", "indicative", number, person, form)
            }
          }
        }
      }
    }

    // Process past tense subjunctive
    if (conjugations.past?.subjunctive) {
      console.log(`Processing past subjunctive for ${baseForm}`)
      for (const [number, persons] of Object.entries(conjugations.past.subjunctive)) {
        if (persons && typeof persons === 'object') {
          for (const [person, data] of Object.entries(persons)) {
            const form = (data as any)?.form
            if (form) {
              addConjugationRecord("past", "subjunctive", number, person, form)
            }
          }
        }
      }
    }

    // Process imperative
    if (conjugations.imperative) {
      console.log(`Processing imperative for ${baseForm}`)
      
      // Singular imperative (du)
      if (Array.isArray(conjugations.imperative.SG)) {
        conjugations.imperative.SG.forEach((form: any) => {
          if (form?.form) {
            addConjugationRecord("imperative", "imperative", "SG", form.person || "2", form.form)
          }
        })
      }

      // Plural imperative (ihr, Sie)
      if (Array.isArray(conjugations.imperative.PL)) {
        conjugations.imperative.PL.forEach((form: any, index: number) => {
          if (form?.form) {
            addConjugationRecord("imperative", "imperative", "PL", form.person || (index === 0 ? "2" : "3"), form.form)
          }
        })
      }
    }

    console.log(`📝 Prepared ${conjugationRecords.length} conjugation records for ${baseForm}`)

    // Save all conjugations in a single transaction
    if (conjugationRecords.length > 0) {
      await prisma.verbConjugation.createMany({
        data: conjugationRecords,
        skipDuplicates: true // Prevent errors from duplicate entries
      })
      
      console.log(`✅ Successfully saved ${conjugationRecords.length} conjugation forms for verb ${baseForm} (ID: ${verbId})`)
      
      // Verify the saved data
      const savedCount = await prisma.verbConjugation.count({
        where: { verbId }
      })
      console.log(`✅ Verification: ${savedCount} conjugations saved in database for verb ID ${verbId}`)
      
      return true
    } else {
      console.log(`⚠️ No valid conjugation forms found for verb ${baseForm} (ID: ${verbId})`)
      return false
    }

  } catch (error) {
    console.error(`❌ Error saving conjugations for verb ${baseForm} (ID: ${verbId}):`, error)
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`)
      console.error(`Stack trace: ${error.stack}`)
    }
    return false
  }
}

// FIXED: Main save function with proper adverb handling
export async function saveProcessedTextAction(userId: string, textData: any) {
  try {
    console.log(`🚀 Starting to save processed text: "${textData.title}"`)
    console.log(`📊 Stats: ${textData.stats.totalWords} total words`)
    console.log(`📊 Word breakdown:`, {
      verbs: textData.stats.verbs,
      nouns: textData.stats.nouns, 
      adjectives: textData.stats.adjectives,
      adverbs: textData.stats.adverbs
    })
    console.log(`📊 Extracted words:`, {
      verbs: textData.extractedWords.verbs?.length || 0,
      nouns: textData.extractedWords.nouns?.length || 0,
      adjectives: textData.extractedWords.adjectives?.length || 0,
      adverbs: textData.extractedWords.adverbs?.length || 0
    })

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

    console.log(`✅ Created saved text with ID: ${savedText.id}`)

    // Process and save extracted words
    const wordPromises = []
    const newVerbsForConjugation: Array<{ verbId: number; baseForm: string }> = []

    // Track unique words in this text to avoid duplicates
    const processedWords = new Set<string>()

    // Process verbs
    console.log(`🔄 Processing ${textData.extractedWords.verbs?.length || 0} verbs...`)
    
    for (const verb of textData.extractedWords.verbs || []) {
      const wordKey = `VERB:${verb.baseForm.toLowerCase()}`
      if (processedWords.has(wordKey)) continue
      processedWords.add(wordKey)

      let existingVerbId = null
      
      // Check if verb already exists
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
        const existingConjugations = await prisma.verbConjugation.count({
          where: { verbId: existingVerb.id }
        })
        
        console.log(`📋 Existing verb ${verb.baseForm} (ID: ${existingVerb.id}) has ${existingConjugations} conjugations`)
        
        // If no conjugations exist, add to the list for conjugation processing
        if (existingConjugations === 0) {
          newVerbsForConjugation.push({ 
            verbId: existingVerb.id, 
            baseForm: verb.baseForm 
          })
          console.log(`➕ Added existing verb ${verb.baseForm} to conjugation queue (missing conjugations)`)
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
          console.log(`✅ Created new verb ${verb.baseForm} (ID: ${newVerb.id}) and added to conjugation queue`)
        } catch (error) {
          console.error(`❌ Error creating verb ${verb.baseForm}:`, error)
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
    console.log(`🔄 Processing ${textData.extractedWords.nouns?.length || 0} nouns...`)
    for (const noun of textData.extractedWords.nouns || []) {
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
          console.log(`✅ Created new noun ${noun.baseForm} (ID: ${newNoun.id})`)
        } catch (error) {
          console.error(`❌ Error creating noun ${noun.baseForm}:`, error)
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
    console.log(`🔄 Processing ${textData.extractedWords.adjectives?.length || 0} adjectives...`)
    for (const adjective of textData.extractedWords.adjectives || []) {
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
          console.log(`✅ Created new adjective ${adjective.baseForm} (ID: ${newAdjective.id})`)
        } catch (error) {
          console.error(`❌ Error creating adjective ${adjective.baseForm}:`, error)
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

    // FIXED: Process adverbs with detailed logging and proper error handling
    console.log(`🔄 Processing ${textData.extractedWords.adverbs?.length || 0} adverbs...`)
    
    if (!textData.extractedWords.adverbs || textData.extractedWords.adverbs.length === 0) {
      console.log(`⚠️ No adverbs found in textData.extractedWords.adverbs`)
      console.log(`💡 Full extractedWords structure:`, Object.keys(textData.extractedWords))
    } else {
      console.log(`📋 Found ${textData.extractedWords.adverbs.length} adverbs to process`)
    }
    
    for (const adverb of textData.extractedWords.adverbs || []) {
      console.log(`🔍 Processing adverb: ${adverb.baseForm} (type: ${adverb.type})`)
      
      const wordKey = `ADVERB:${adverb.baseForm.toLowerCase()}`
      if (processedWords.has(wordKey)) {
        console.log(`⏭️ Skipping duplicate adverb: ${adverb.baseForm}`)
        continue
      }
      processedWords.add(wordKey)

      let existingAdverbId = null
      
      try {
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
          console.log(`📋 Found existing adverb ${adverb.baseForm} (ID: ${existingAdverb.id})`)
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
            console.log(`✅ Created new adverb ${adverb.baseForm} (ID: ${newAdverb.id}, type: ${adverb.type || "other"})`)
          } catch (createError) {
            console.error(`❌ Error creating adverb ${adverb.baseForm}:`, createError)
            // Continue with null ID to still create the ExtractedWord record
          }
        }

        // Create the ExtractedWord record for this adverb
        const extractedWordPromise = prisma.extractedWord.create({
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
            adverbId: existingAdverbId, // This links to the Adverb table
          },
        })

        wordPromises.push(extractedWordPromise)
        console.log(`➕ Added adverb ${adverb.baseForm} to word promises queue`)
        
      } catch (findError) {
        console.error(`❌ Error processing adverb ${adverb.baseForm}:`, findError)
      }
    }

    // Wait for all word creation promises to complete
    console.log(`⏳ Saving ${wordPromises.length} extracted words...`)
    const wordResults = await Promise.allSettled(wordPromises)
    
    // Count successful vs failed word saves
    let successfulWords = 0
    let failedWords = 0
    
    wordResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulWords++
      } else {
        failedWords++
        console.error(`❌ Failed to save word ${index}:`, result.reason)
      }
    })
    
    console.log(`📊 Word saving complete: ${successfulWords} successful, ${failedWords} failed`)

    // Verify adverbs were saved correctly
    const savedAdverbsCount = await prisma.extractedWord.count({
      where: {
        savedTextId: savedText.id,
        type: "ADVERB"
      }
    })
    console.log(`🔍 Verification: ${savedAdverbsCount} adverbs saved in ExtractedWord table`)

    // Process verb conjugations
    console.log(`🔄 Processing conjugations for ${newVerbsForConjugation.length} verbs...`)
    
    if (newVerbsForConjugation.length === 0) {
      console.log(`ℹ️ No new verbs need conjugations`)
    } else {
      // Process conjugations in smaller batches to avoid overwhelming the API
      const CONJUGATION_BATCH_SIZE = 2
      let successfulConjugations = 0
      let failedConjugations = 0
      
      for (let i = 0; i < newVerbsForConjugation.length; i += CONJUGATION_BATCH_SIZE) {
        const batch = newVerbsForConjugation.slice(i, i + CONJUGATION_BATCH_SIZE)
        console.log(`📦 Processing conjugation batch ${Math.floor(i/CONJUGATION_BATCH_SIZE) + 1}/${Math.ceil(newVerbsForConjugation.length/CONJUGATION_BATCH_SIZE)}`)
        
        const batchResults = await Promise.allSettled(
          batch.map(({ verbId, baseForm }) => 
            saveVerbConjugations(verbId, baseForm)
          )
        )
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value === true) {
            successfulConjugations++
            console.log(`✅ Conjugations saved for ${batch[index].baseForm}`)
          } else {
            failedConjugations++
            console.log(`❌ Failed to save conjugations for ${batch[index].baseForm}`)
            if (result.status === 'rejected') {
              console.error(`Error: ${result.reason}`)
            }
          }
        })
        
        if (i + CONJUGATION_BATCH_SIZE < newVerbsForConjugation.length) {
          console.log(`⏳ Waiting before processing next conjugation batch...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      console.log(`📊 Conjugation processing complete: ${successfulConjugations} successful, ${failedConjugations} failed`)
    }

    console.log(`🎉 Text processing completed successfully`)
    console.log(`📈 Final summary:`)
    console.log(`   - Text ID: ${savedText.id}`)
    console.log(`   - Words saved: ${successfulWords}/${wordPromises.length}`)
    console.log(`   - Adverbs verified: ${savedAdverbsCount}`)
    console.log(`   - Verb conjugations: ${newVerbsForConjugation.length} processed`)
    
    return { success: true, savedTextId: savedText.id }
    
  } catch (error) {
    console.error("❌ Critical error saving processed text:", error)
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`)
      console.error(`Stack trace: ${error.stack}`)
    }
    return { success: false, error: "An error occurred while saving the text" }
  }
}