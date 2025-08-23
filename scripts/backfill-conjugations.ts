// scripts/backfill-conjugations.ts - Utility to add conjugations to existing verbs
import { PrismaClient } from '@prisma/client'
import { createTranslator } from '../lib/translator'

const prisma = new PrismaClient()

async function saveVerbConjugations(verbId: number, baseForm: string, translator: any) {
  try {
    console.log(`Getting conjugations for verb: ${baseForm} (ID: ${verbId})`)
    
    const conjugationData = await translator.getVerbConjugations(baseForm)
    
    if (!conjugationData.conjugations) {
      console.log(`No conjugations found for ${baseForm}`)
      return { success: false, count: 0 }
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
              person: form.person || "2",
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
              person: form.person || (index === 0 ? "2" : "3"),
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
      console.log(`✅ Successfully saved ${conjugationRecords.length} conjugation forms for ${baseForm}`)
      return { success: true, count: conjugationRecords.length }
    } else {
      console.log(`⚠️  No valid conjugation forms found for ${baseForm}`)
      return { success: false, count: 0 }
    }

  } catch (error) {
    console.error(`❌ Error saving conjugations for ${baseForm} (ID: ${verbId}):`, error)
    return { success: false, count: 0, error: error.message }
  }
}

async function backfillConjugations() {
  console.log('🚀 Starting conjugation backfill process...')
  
  try {
    // Get all verbs that don't have conjugations
    const verbsWithoutConjugations = await prisma.verb.findMany({
      where: {
        conjugations: {
          none: {}
        }
      },
      orderBy: {
        baseForm: 'asc'
      }
    })

    console.log(`📊 Found ${verbsWithoutConjugations.length} verbs without conjugations`)

    if (verbsWithoutConjugations.length === 0) {
      console.log('✨ All verbs already have conjugations!')
      return
    }

    const translator = createTranslator()
    let processed = 0
    let successful = 0
    let totalConjugations = 0
    const errors: string[] = []

    // Process in batches to avoid overwhelming the API
    const BATCH_SIZE = 3
    const DELAY_BETWEEN_BATCHES = 1000 // 1 second

    for (let i = 0; i < verbsWithoutConjugations.length; i += BATCH_SIZE) {
      const batch = verbsWithoutConjugations.slice(i, i + BATCH_SIZE)
      
      console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(verbsWithoutConjugations.length/BATCH_SIZE)}`)
      console.log(`   Verbs: ${batch.map(v => v.baseForm).join(', ')}`)

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(verb => saveVerbConjugations(verb.id, verb.baseForm, translator))
      )

      // Collect results
      batchResults.forEach((result, index) => {
        processed++
        if (result.success) {
          successful++
          totalConjugations += result.count
        } else {
          errors.push(`${batch[index].baseForm}: ${result.error || 'Unknown error'}`)
        }
      })

      console.log(`   Batch completed: ${batchResults.filter(r => r.success).length}/${batch.length} successful`)

      // Delay between batches (except for the last batch)
      if (i + BATCH_SIZE < verbsWithoutConjugations.length) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
      }
    }

    // Summary
    console.log('\n📈 BACKFILL SUMMARY')
    console.log('='.repeat(50))
    console.log(`Total verbs processed: ${processed}`)
    console.log(`Successfully processed: ${successful}`)
    console.log(`Failed: ${processed - successful}`)
    console.log(`Total conjugations created: ${totalConjugations}`)
    console.log(`Success rate: ${((successful/processed) * 100).toFixed(1)}%`)

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:')
      errors.forEach(error => console.log(`   - ${error}`))
    }

    console.log('\n✅ Backfill process completed!')

  } catch (error) {
    console.error('💥 Fatal error during backfill process:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution
if (require.main === module) {
  backfillConjugations()
    .then(() => {
      console.log('🎉 Script completed successfully')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

export { backfillConjugations, saveVerbConjugations }