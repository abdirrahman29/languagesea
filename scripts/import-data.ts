import { importVerbs, importNouns, importAdjectives } from "@/lib/import-data"

async function main() {
  console.log("Starting data import...")

  // Import verbs
  await importVerbs("data/german_verb_conjugations_with_levels.json")

  // Import nouns
  await importNouns("data/german_nouns_with_levels.json")

  // Import adjectives
  await importAdjectives("data/german_adjectives_with_levels.json")

  console.log("Data import completed!")
}

main().catch(console.error)
