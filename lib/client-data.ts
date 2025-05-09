import type { VerbData, NounData, AdjectiveData } from "@/lib/types"

// Client-side data fetching functions that call the API routes

export async function fetchVerbsClient(): Promise<VerbData[]> {
  try {
    const response = await fetch("/api/vocabulary/verbs")
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching verbs:", error)
    return []
  }
}

export async function fetchNounsClient(): Promise<NounData[]> {
  try {
    const response = await fetch("/api/vocabulary/nouns")
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching nouns:", error)
    return []
  }
}

export async function fetchAdjectivesClient(): Promise<AdjectiveData[]> {
  try {
    const response = await fetch("/api/vocabulary/adjectives")
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching adjectives:", error)
    return []
  }
}

// Sample data for fallback
export async function getSampleVerbs(): Promise<VerbData[]> {
  return [
    {
      id: 1,
      base_form: "gehen",
      level: "A1",
      dateAdded: new Date().toISOString(),
      present: {
        indicative: {
          SG: {
            "1": { form: "gehe", id: 101 },
            "2": { form: "gehst", id: 102 },
            "3": { form: "geht", id: 103 },
          },
          PL: {
            "1": { form: "gehen", id: 104 },
            "2": { form: "geht", id: 105 },
            "3": { form: "gehen", id: 106 },
          },
        },
      },
      past: {
        indicative: {
          SG: {
            "1": { form: "ging", id: 107 },
            "2": { form: "gingst", id: 108 },
            "3": { form: "ging", id: 109 },
          },
        },
      },
    },
    {
      id: 2,
      base_form: "sein",
      level: "A1",
      dateAdded: new Date().toISOString(),
      present: {
        indicative: {
          SG: {
            "1": { form: "bin", id: 201 },
            "2": { form: "bist", id: 202 },
            "3": { form: "ist", id: 203 },
          },
          PL: {
            "1": { form: "sind", id: 204 },
            "2": { form: "seid", id: 205 },
            "3": { form: "sind", id: 206 },
          },
        },
      },
      past: {
        indicative: {
          SG: {
            "1": { form: "war", id: 207 },
            "2": { form: "warst", id: 208 },
            "3": { form: "war", id: 209 },
          },
        },
      },
    },
  ]
}

export async function getSampleNouns(): Promise<NounData[]> {
  return [
    {
      id: 1,
      base_form: "Haus",
      level: "A1",
      dateAdded: new Date().toISOString(),
      cases: {
        NOM: {
          NEUT: {
            SG: { form: "das Haus", id: 101 },
            PL: { form: "die Häuser", id: 102 },
          },
        },
      },
    },
    {
      id: 2,
      base_form: "Frau",
      level: "A1",
      dateAdded: new Date().toISOString(),
      cases: {
        NOM: {
          FEM: {
            SG: { form: "die Frau", id: 201 },
            PL: { form: "die Frauen", id: 202 },
          },
        },
      },
    },
  ]
}

export async function getSampleAdjectives(): Promise<AdjectiveData[]> {
  return [
    {
      id: 1,
      base_form: "gut",
      level: "A1",
      dateAdded: new Date().toISOString(),
      forms: {
        comparative: "besser",
        superlative: "am besten",
      },
    },
    {
      id: 2,
      base_form: "schön",
      level: "A1",
      dateAdded: new Date().toISOString(),
      forms: {
        comparative: "schöner",
        superlative: "am schönsten",
      },
    },
  ]
}
