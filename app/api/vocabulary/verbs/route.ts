// API endpoint: /api/vocabulary/verbs/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Helper function to transform conjugation data to match the expected format
function transformConjugations(conjugations: any[]) {
  const result = {
    present: {
      indicative: { SG: {}, PL: {} },
      subjunctive: { SG: {}, PL: {} }
    },
    past: {
      indicative: { SG: {}, PL: {} },
      subjunctive: { SG: {}, PL: {} }
    },
    imperative: {
      SG: [],
      PL: []
    }
  }

  conjugations.forEach((conj) => {
    if (conj.tense === "imperative") {
      // Handle imperative forms
      if (conj.number === "SG") {
        result.imperative.SG.push({
          form: conj.form,
          person: conj.person
        })
      } else if (conj.number === "PL") {
        result.imperative.PL.push({
          form: conj.form,
          person: conj.person
        })
      }
    } else {
      // Handle present and past tenses
      const tenseData = result[conj.tense as keyof typeof result]
      if (tenseData && typeof tenseData === 'object' && 'indicative' in tenseData) {
        const moodData = tenseData[conj.mood as 'indicative' | 'subjunctive']
        if (moodData) {
          const numberData = moodData[conj.number as 'SG' | 'PL']
          if (numberData) {
            (numberData as any)[conj.person] = {
              form: conj.form,
              person: conj.person
            }
          }
        }
      }
    }
  })

  return result
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const verbId = searchParams.get("verbId")

    if (verbId) {
      // Fetch specific verb with conjugations
      const verb = await prisma.verb.findUnique({
        where: { id: parseInt(verbId) },
        include: {
          conjugations: {
            orderBy: [
              { tense: 'asc' },
              { mood: 'asc' },
              { number: 'asc' },
              { person: 'asc' }
            ]
          }
        }
      })

      if (!verb) {
        return NextResponse.json({ error: "Verb not found" }, { status: 404 })
      }

      // Transform the conjugations to match the expected format
      const transformedConjugations = transformConjugations(verb.conjugations)

      const verbData = {
        id: verb.id,
        base_form: verb.baseForm,
        level: verb.level,
        present: transformedConjugations.present,
        past: transformedConjugations.past,
        imperative: transformedConjugations.imperative,
        dateAdded: verb.dateAdded
      }

      return NextResponse.json(verbData)
    }

    // Fetch all verbs (existing functionality)
    let verbs

    if (userId) {
      // Fetch verbs specific to user (from their processed texts or practiced words)
      verbs = await prisma.verb.findMany({
        where: {
          OR: [
            {
              extractedInTexts: {
                some: {
                  savedText: {
                    userId: userId
                  }
                }
              }
            },
            {
              practicedBy: {
                some: {
                  userId: userId
                }
              }
            }
          ]
        },
        include: {
          conjugations: {
            orderBy: [
              { tense: 'asc' },
              { mood: 'asc' },
              { number: 'asc' },
              { person: 'asc' }
            ]
          }
        },
        orderBy: {
          baseForm: 'asc'
        }
      })
    } else {
      // Fetch all verbs
      verbs = await prisma.verb.findMany({
        include: {
          conjugations: {
            orderBy: [
              { tense: 'asc' },
              { mood: 'asc' },
              { number: 'asc' },
              { person: 'asc' }
            ]
          }
        },
        orderBy: {
          baseForm: 'asc'
        }
      })
    }

    // Transform the data to match the expected format
    const verbsData = verbs.map(verb => {
      const transformedConjugations = transformConjugations(verb.conjugations)
      
      return {
        id: verb.id,
        base_form: verb.baseForm,
        level: verb.level,
        present: transformedConjugations.present,
        past: transformedConjugations.past,
        imperative: transformedConjugations.imperative,
        dateAdded: verb.dateAdded,
        hasConjugations: verb.conjugations.length > 0
      }
    })

    return NextResponse.json(verbsData)
  } catch (error) {
    console.error("Error fetching verbs:", error)
    return NextResponse.json(
      { error: "Failed to fetch verbs" },
      { status: 500 }
    )
  }
}

// Optional: Add endpoint to manually trigger conjugation generation
export async function POST(request: NextRequest) {
  try {
    const { verbId } = await request.json()

    if (!verbId) {
      return NextResponse.json({ error: "Verb ID is required" }, { status: 400 })
    }

    const verb = await prisma.verb.findUnique({
      where: { id: verbId }
    })

    if (!verb) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 })
    }

    // Import the conjugation function (you'll need to make it available)
    const { createTranslator } = await import("@/lib/translator")
    const translator = createTranslator()

    console.log(`Generating conjugations for verb: ${verb.baseForm}`)
    
    const conjugationData = await translator.getVerbConjugations(verb.baseForm)
    
    if (!conjugationData.conjugations) {
      return NextResponse.json({ error: "Could not generate conjugations" }, { status: 500 })
    }

    // Clear existing conjugations for this verb
    await prisma.verbConjugation.deleteMany({
      where: { verbId: verb.id }
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
                verbId: verb.id,
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
                verbId: verb.id,
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
                verbId: verb.id,
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
                verbId: verb.id,
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
              verbId: verb.id,
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
              verbId: verb.id,
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
    }

    return NextResponse.json({ 
      success: true, 
      message: `Generated ${conjugationRecords.length} conjugation forms for ${verb.baseForm}` 
    })

  } catch (error) {
    console.error("Error generating conjugations:", error)
    return NextResponse.json(
      { error: "Failed to generate conjugations" },
      { status: 500 }
    )
  }
}