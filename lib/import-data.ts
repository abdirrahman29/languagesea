import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

// Function to import verbs from JSON file
export async function importVerbs(filePath: string) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), "utf8"))

    for (const [baseForm, verbData] of Object.entries(data)) {
      const verb = verbData as any

      // Create the verb
      const createdVerb = await prisma.verb.create({
        data: {
          id: verb.id,
          baseForm: verb.base_form,
          level: verb.level,
          infinitive: verb.infinitive,
          infinitiveId: verb.infinitive_id,
          coOccurrenceBitmask: verb.co_occurrence_bitmask,
          bigramsAndPositionHex: verb.bigrams_and_position_hex,
        },
      })

      // Create conjugations
      if (verb.present?.indicative) {
        await createConjugations(createdVerb.id, "present", "indicative", verb.present.indicative)
      }

      if (verb.present?.subjunctive) {
        await createConjugations(createdVerb.id, "present", "subjunctive", verb.present.subjunctive)
      }

      if (verb.past?.indicative) {
        await createConjugations(createdVerb.id, "past", "indicative", verb.past.indicative)
      }

      if (verb.past?.subjunctive) {
        await createConjugations(createdVerb.id, "past", "subjunctive", verb.past.subjunctive)
      }
    }

    console.log("Verbs imported successfully")
  } catch (error) {
    console.error("Error importing verbs:", error)
  }
}

// Helper function to create conjugations
async function createConjugations(verbId: number, tense: string, mood: string, data: any) {
  for (const [number, persons] of Object.entries(data)) {
    for (const [person, form] of Object.entries(persons as any)) {
      await prisma.verbConjugation.create({
        data: {
          verbId,
          tense,
          mood,
          number,
          person,
          form: (form as any).form,
          formId: (form as any).id,
        },
      })
    }
  }
}

// Function to import nouns from JSON file
export async function importNouns(filePath: string) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), "utf8"))

    for (const [baseForm, nounData] of Object.entries(data)) {
      const noun = nounData as any

      // Create the noun
      const createdNoun = await prisma.noun.create({
        data: {
          id: noun.id,
          baseForm: noun.base_form,
          level: noun.level,
          coOccurrenceBitmask: noun.co_occurrence_bitmask,
          bigramsAndPositionHex: noun.bigrams_and_position_hex,
        },
      })

      // Create cases
      if (noun.cases) {
        for (const [caseName, genders] of Object.entries(noun.cases)) {
          for (const [gender, numbers] of Object.entries(genders as any)) {
            for (const [number, form] of Object.entries(numbers as any)) {
              await prisma.nounCase.create({
                data: {
                  nounId: createdNoun.id,
                  case: caseName,
                  gender,
                  number,
                  form: (form as any).form,
                  formId: (form as any).id,
                },
              })
            }
          }
        }
      }
    }

    console.log("Nouns imported successfully")
  } catch (error) {
    console.error("Error importing nouns:", error)
  }
}

// Function to import adjectives from JSON file
export async function importAdjectives(filePath: string) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), filePath), "utf8"))

    for (const [baseForm, adjectiveData] of Object.entries(data)) {
      const adjective = adjectiveData as any

      // Create the adjective
      const createdAdjective = await prisma.adjective.create({
        data: {
          id: adjective.id,
          baseForm: adjective.base_form,
          level: adjective.level,
          coOccurrenceBitmask: adjective.co_occurrence_bitmask,
          bigramsAndPositionHex: adjective.bigrams_and_position_hex,
        },
      })

      // Create declensions
      if (adjective.declensions) {
        for (const [caseName, genders] of Object.entries(adjective.declensions)) {
          for (const [gender, numbers] of Object.entries(genders as any)) {
            for (const [number, form] of Object.entries(numbers as any)) {
              await prisma.adjectiveDeclension.create({
                data: {
                  adjectiveId: createdAdjective.id,
                  case: caseName,
                  gender,
                  number,
                  form: (form as any).form,
                  formId: (form as any).id,
                },
              })
            }
          }
        }
      }

      // Create comparative and superlative forms
      if (adjective.forms?.comparative) {
        await prisma.adjectiveComparison.create({
          data: {
            adjectiveId: createdAdjective.id,
            type: "comparative",
            form: adjective.forms.comparative,
            example: adjective.examples?.comparative,
          },
        })
      }

      if (adjective.forms?.superlative) {
        await prisma.adjectiveComparison.create({
          data: {
            adjectiveId: createdAdjective.id,
            type: "superlative",
            form: adjective.forms.superlative,
            example: adjective.examples?.superlative,
          },
        })
      }
    }

    console.log("Adjectives imported successfully")
  } catch (error) {
    console.error("Error importing adjectives:", error)
  }
}
