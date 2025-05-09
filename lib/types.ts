// Type definitions for the German text processing system

// Verb data structure
export interface VerbData {
  level: string
  base_form: string
  id: number
  infinitive?: string
  infinitive_id?: number
  co_occurrence_bitmask?: string
  bigrams_and_position_hex?: string
  dateAdded: string
  present?: {
    indicative?: {
      SG?: {
        [key: string]: { form: string; id: number }
      }
      PL?: {
        [key: string]: { form: string; id: number }
      }
    }
    subjunctive?: {
      SG?: {
        [key: string]: { form: string; id: number }
      }
      PL?: {
        [key: string]: { form: string; id: number }
      }
    }
  }
  past?: {
    indicative?: {
      SG?: {
        [key: string]: { form: string; id: number }
      }
      PL?: {
        [key: string]: { form: string; id: number }
      }
    }
    subjunctive?: {
      SG?: {
        [key: string]: { form: string; id: number }
      }
      PL?: {
        [key: string]: { form: string; id: number }
      }
    }
  }
  imperative?: {
    SG?: Array<{ form: string; id: number }>
    PL?: Array<{ form: string; id: number }>
  }
}

// Noun data structure
export interface NounData {
  level: string
  base_form: string
  id: number
  co_occurrence_bitmask?: string
  bigrams_and_position_hex?: string
  dateAdded: string
  cases?: {
    [caseType: string]: {
      [gender: string]: {
        [number: string]: {
          form: string
          id: number
        }
      }
    }
  }
}

// Adjective data structure
export interface AdjectiveData {
  level: string
  base_form: string
  id: number
  co_occurrence_bitmask?: string
  bigrams_and_position_hex?: string
  dateAdded: string
  forms?: {
    attributive?: {
      [gender: string]: {
        [caseType: string]: string
      }
    }
    comparative?: string
    superlative?: string
  }
  examples?: {
    comparative?: string
    superlative?: string
  }
}

// Word data structure for extracted words
export interface WordData {
  id: number
  text: string
  baseForm: string
  type: string
  level: string
  translation: string
  gender?: string
  case?: string
  tense?: string
  practiced: boolean
  isNew: boolean
  isRepeat?: boolean // New property to track repeated words
  isKnown: boolean
  occurrences: Array<{
    textTitle: string
    date: string
    sentence: string
    translation: string
  }>
  verbId?: number
  nounId?: number
  adjectiveId?: number
}

// Saved text structure
export interface SavedText {
  id: number
  title: string
  level: string
  dateAdded: string
  excerpt: string
  wordCount: number
  readingTime: number
  content: string
  stats: {
    totalWords: number
    verbs: number
    nouns: number
    adjectives: number
    adverbs: number
    newWords: number
    practicedWords: number
    knownFromOtherTexts: number
    levelA1: number
    levelA2: number
    levelB1: number
    levelB2Plus: number
  }
  words?: WordData[]
}

// Processing result structure
export interface ProcessingResult {
  stats: {
    totalWords: number
    verbs: number
    nouns: number
    adjectives: number
    adverbs: number
    newWords: number
    newVerbs: number
    newNouns: number
    newAdjectives: number
    existingWords: number
    levelA1: number
    levelA2: number
    levelB1: number
    levelB2Plus: number
  }
  extractedWords: {
    verbs: Array<{
      baseForm: string
      originalForm: string
      level: string
      tense?: string
      translation?: string
      isNew: boolean
      isRepeat: boolean
      sentence?: string
      sentenceTranslation?: string

    }>
    nouns: Array<{
      baseForm: string
      originalForm: string
      level: string
      gender?: string
      case?: string
      translation?: string
      isNew: boolean
      sentence?: string
      sentenceTranslation?: string
    }>
    adjectives: Array<{
      baseForm: string
      originalForm: string
      level: string
      case?: string
      translation?: string
      isNew: boolean
      sentence?: string
      sentenceTranslation?: string
    }>
    adverbs: Array<{
      baseForm: string
      originalForm: string
      level: string
      translation?: string
      isNew: boolean
      sentence?: string
      sentenceTranslation?: string
    }>
  }
  sentences: Array<{
    german: string
    english: string
    words: Array<{
      baseForm: string
      type: string
    }>
  }>
}
export interface ThemeCategory {
  id: string
  name: string
  description?: string
  words: ThemeCategoryWord[]
}

export interface ThemeCategoryWord {
  id: string
  themeCategoryId: string
  text: string
  type: string
  level: string
  translation: string
  gender?: string
}

// Frequency word data structure
export interface FrequencyWord {
  id: number
  text: string
  baseForm?: string
  type: string
  level: string
  translation: string
  gender?: string
  tense?: string
  case?: string
  practiced: boolean
  frequency: number
  textsCount: number
  occurrences: Array<{
    textTitle: string
    date: string
    sentence: string
    translation: string
  }>
}
