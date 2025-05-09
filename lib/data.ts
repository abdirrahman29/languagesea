import type {
  VerbData,
  NounData,
  AdjectiveData,
  SavedText,
  FrequencyWord,
  // @ts-ignore
  WordCollocation,
  ThemeCategory,
} from "./types"
import  {prisma}  from "@/lib/db"

// Sample data for development - in a real app, this would be fetched from your JSON files



// Sample collocation data
const sampleCollocations: WordCollocation[] = [
  {
    id: 1,
    firstWord: "eine Reise",
    secondWord: "machen",
    strength: 0.85,
    example: "Wir machen eine Reise nach Berlin.",
    themes: ["travel", "daily"],
  },
  {
    id: 2,
    firstWord: "zur Schule",
    secondWord: "gehen",
    strength: 0.92,
    example: "Die Kinder gehen zur Schule.",
    themes: ["education", "daily"],
  },
  {
    id: 3,
    firstWord: "das Essen",
    secondWord: "kochen",
    strength: 0.78,
    example: "Meine Mutter kocht das Essen.",
    themes: ["cooking", "daily"],
  },
  {
    id: 4,
    firstWord: "einen Film",
    secondWord: "sehen",
    strength: 0.65,
    example: "Wir sehen einen Film im Kino.",
    themes: ["entertainment", "daily"],
  },
  {
    id: 5,
    firstWord: "eine E-Mail",
    secondWord: "schreiben",
    strength: 0.72,
    example: "Ich schreibe eine E-Mail an meinen Chef.",
    themes: ["business", "technology"],
  },
  {
    id: 6,
    firstWord: "Medikamente",
    secondWord: "nehmen",
    strength: 0.81,
    example: "Der Patient muss die Medikamente dreimal täglich nehmen.",
    themes: ["health", "daily"],
  },
  {
    id: 7,
    firstWord: "eine Prüfung",
    secondWord: "bestehen",
    strength: 0.75,
    example: "Sie hat die Prüfung mit einer guten Note bestanden.",
    themes: ["education"],
  },
  {
    id: 8,
    firstWord: "ein Formular",
    secondWord: "ausfüllen",
    strength: 0.68,
    example: "Bitte füllen Sie das Formular vollständig aus.",
    themes: ["business", "daily"],
  },
  {
    id: 9,
    firstWord: "Geld",
    secondWord: "sparen",
    strength: 0.79,
    example: "Er spart Geld für ein neues Auto.",
    themes: ["business", "daily"],
  },
  {
    id: 10,
    firstWord: "einen Termin",
    secondWord: "vereinbaren",
    strength: 0.71,
    example: "Ich muss einen Termin beim Arzt vereinbaren.",
    themes: ["health", "business", "daily"],
  },
  {
    id: 11,
    firstWord: "das Zimmer",
    secondWord: "aufräumen",
    strength: 0.63,
    example: "Die Kinder müssen ihre Zimmer aufräumen.",
    themes: ["daily"],
  },
  {
    id: 12,
    firstWord: "eine Frage",
    secondWord: "stellen",
    strength: 0.88,
    example: "Der Student stellt dem Professor eine Frage.",
    themes: ["education", "daily"],
  },
]

// Sample theme categories


// In a real app, these functions would fetch data from your JSON files



export async function getSavedTexts(userId: string) {
  console.log('Querying for user:', userId);
  
  const result = await prisma.savedText.findMany({
    where: { userId },
    include: { extractedWords: true }
  });

  console.log('Raw DB result:', JSON.stringify(result, null, 2));
  return result;
}


export async function getCollocationData(): Promise<WordCollocation[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500))
  return sampleCollocations
}

export async function getThemeCategories() {
  try {
    const response = await fetch("/api/themes")
    if (response.ok) {
      return await response.json()
    }
    return []
  } catch (error) {
    console.error("Error fetching theme categories:", error)
    return []
  }
}


// In a real implementation, you would add functions to load the actual JSON files
// For example:
/*
export async function loadVerbsFromJson() {
  const response = await fetch('/data/german_verb_conjugations_with_levels.json');
  const data = await response.json();
  return Object.entries(data).map(([key, value]) => ({
    base_form: key,
    ...value
  }));
}
*/
