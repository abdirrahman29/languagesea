import { prisma } from "@/lib/db"
import type { VerbData, NounData, AdjectiveData } from "@/lib/types"
import * as germanVerbData from "@/data/german_verb_conjugations.json"

// Function to fetch verbs from the database for a specific user
export async function fetchVerbs(userId?: string): Promise<VerbData[]> {
  try {
    // If userId is provided, fetch only verbs that the user has encountered
    if (userId) {
      // Get all verb IDs from the user's extracted words
      const userVerbIds = await prisma.extractedWord.findMany({
        where: {
          savedText: {
            userId: userId,
          },
          type: "VERB",
          verbId: {
            not: null,
          },
        },
        select: {
          verbId: true,
        },
        distinct: ["verbId"],
      })

      // If no verbs found, return empty array
      if (userVerbIds.length === 0) {
        return []
      }

      // Fetch the actual verbs using those IDs
      const dbVerbs = await prisma.verb.findMany({
        where: {
          id: {
            in: userVerbIds.map((v) => v.verbId!).filter(Boolean),
          },
        },
        orderBy: {
          baseForm: "asc",
        },
      })

      // Transform to VerbData format
      return dbVerbs.map((verb) => {
        // Find the verb in our JSON data to get the full conjugation details
        const jsonVerb = (germanVerbData as any)[verb.baseForm.toLowerCase()]

        // If we have the verb in our JSON data, merge the database and JSON data
        if (jsonVerb) {
          return {
            id: verb.id,
            base_form: verb.baseForm,
            level: verb.level,
            dateAdded: verb.dateAdded.toISOString(),
            ...jsonVerb,
          }
        }

        // If not in JSON, return just the database data
        return {
          id: verb.id,
          base_form: verb.baseForm,
          level: verb.level,
          dateAdded: verb.dateAdded.toISOString(),
          present: {},
          past: {},
          imperative: {},
        }
      })
    }

    // If no userId, return empty array - we don't want to show all verbs from JSON
    return []
  } catch (error) {
    console.error("Error fetching verbs:", error)
    return []
  }
}

// Function to fetch nouns from the database for a specific user
export async function fetchNouns(userId?: string): Promise<NounData[]> {
  try {
    // If userId is provided, fetch only nouns that the user has encountered
    if (userId) {
      // Get all noun IDs from the user's extracted words
      const userNounIds = await prisma.extractedWord.findMany({
        where: {
          savedText: {
            userId: userId,
          },
          type: "NOUN",
          nounId: {
            not: null,
          },
        },
        select: {
          nounId: true,
        },
        distinct: ["nounId"],
      })

      // If no nouns found, return empty array
      if (userNounIds.length === 0) {
        return []
      }

      // Fetch the actual nouns using those IDs
      const dbNouns = await prisma.noun.findMany({
        where: {
          id: {
            in: userNounIds.map((n) => n.nounId!).filter(Boolean),
          },
        },
        orderBy: {
          baseForm: "asc",
        },
      })

      // Transform to NounData format
      return dbNouns.map((noun) => {
        // Find the noun in our JSON data to get the full declension details
        const jsonNoun = Object.entries(germanVerbData).find(
          ([_, data]) => (data as any).base_form === noun.baseForm && (data as any).cases,
        )?.[1] as any

        // If we have the noun in our JSON data, merge the database and JSON data
        if (jsonNoun) {
          return {
            id: noun.id,
            base_form: noun.baseForm,
            level: noun.level,
            dateAdded: noun.dateAdded.toISOString(),
            cases: jsonNoun.cases,
          }
        }

        // If not in JSON, return just the database data
        return {
          id: noun.id,
          base_form: noun.baseForm,
          level: noun.level,
          dateAdded: noun.dateAdded.toISOString(),
          cases: {},
        }
      })
    }

    // If no userId, return empty array - we don't want to show all nouns from JSON
    return []
  } catch (error) {
    console.error("Error fetching nouns:", error)
    return []
  }
}

// Function to fetch adjectives from the database for a specific user
export async function fetchAdjectives(userId?: string): Promise<AdjectiveData[]> {
  try {
    // If userId is provided, fetch only adjectives that the user has encountered
    if (userId) {
      // Get all adjective IDs from the user's extracted words
      const userAdjectiveIds = await prisma.extractedWord.findMany({
        where: {
          savedText: {
            userId: userId,
          },
          type: "ADJ",
          adjectiveId: {
            not: null,
          },
        },
        select: {
          adjectiveId: true,
        },
        distinct: ["adjectiveId"],
      })

      // If no adjectives found, return empty array
      if (userAdjectiveIds.length === 0) {
        return []
      }

      // Fetch the actual adjectives using those IDs
      const dbAdjectives = await prisma.adjective.findMany({
        where: {
          id: {
            in: userAdjectiveIds.map((a) => a.adjectiveId!).filter(Boolean),
          },
        },
        orderBy: {
          baseForm: "asc",
        },
      })

      // Transform to AdjectiveData format
      return dbAdjectives.map((adjective) => {
        // Find the adjective in our JSON data to get the full declension details
        const jsonAdjective = Object.entries(germanVerbData).find(
          ([_, data]) =>
            (data as any).base_form === adjective.baseForm && ((data as any).declensions || (data as any).degrees),
        )?.[1] as any

        // If we have the adjective in our JSON data, merge the database and JSON data
        if (jsonAdjective) {
          return {
            id: adjective.id,
            base_form: adjective.baseForm,
            level: adjective.level,
            dateAdded: adjective.dateAdded.toISOString(),
            declensions: jsonAdjective.declensions,
            degrees: jsonAdjective.degrees,
            forms: jsonAdjective.forms,
            examples: jsonAdjective.examples,
          }
        }

        // If not in JSON, return just the database data
        return {
          id: adjective.id,
          base_form: adjective.baseForm,
          level: adjective.level,
          dateAdded: adjective.dateAdded.toISOString(),
          declensions: {},
          degrees: {},
          forms: {},
        }
      })
    }

    // If no userId, return empty array - we don't want to show all adjectives from JSON
    return []
  } catch (error) {
    console.error("Error fetching adjectives:", error)
    return []
  }
}

// Function to fetch saved texts for a user
export async function fetchSavedTexts(userId: string) {
  try {
    const savedTexts = await prisma.savedText.findMany({
      where: {
        userId,
      },
      include: {
        stats: true,
        extractedWords: {
          include: {
            verb: true,
            noun: true,
            adjective: true,
          },
        },
      },
      orderBy: {
        dateAdded: "desc",
      },
    })

    // Transform database model to application model
    return savedTexts.map((text) => {
      const words = text.extractedWords.map((word) => ({
        id: Number(word.id),
        text: word.originalForm || word.baseForm,
        baseForm: word.baseForm,
        type: word.type,
        level: word.level || "Unknown",
        translation: word.translation || "",
        gender: word.gender,
        case: word.case,
        tense: word.tense,
        practiced: false, // This would need to be checked against PracticedWord table
        isNew: word.isNew,
        isRepeat: word.isRepeat || false, // Include the isRepeat flag
        appearsInOtherTexts: false, // This would need additional query
        occurrences: [
          {
            textTitle: text.title,
            date: text.dateAdded.toISOString(),
            sentence: word.sentence || "",
            translation: word.sentenceTranslation || "",
          },
        ],
        verbId: word.verbId,
        nounId: word.nounId,
        adjectiveId: word.adjectiveId,
      }))

      return {
        id: Number(text.id),
        title: text.title,
        level: text.level,
        dateAdded: text.dateAdded.toISOString(),
        excerpt: text.excerpt || "",
        wordCount: text.wordCount,
        readingTime: text.readingTime,
        content: text.content,
        stats: text.stats
          ? {
              totalWords: text.stats.totalWords,
              verbs: text.stats.verbs,
              nouns: text.stats.nouns,
              adjectives: text.stats.adjectives,
              adverbs: text.stats.adverbs,
              newWords: text.stats.newWords,
              practicedWords: text.stats.practicedWords,
              knownFromOtherTexts: text.stats.knownFromOtherTexts,
              levelA1: text.stats.levelA1,
              levelA2: text.stats.levelA2,
              levelB1: text.stats.levelB1,
              levelB2Plus: text.stats.levelB2Plus,
            }
          : {
              totalWords: 0,
              verbs: 0,
              nouns: 0,
              adjectives: 0,
              adverbs: 0,
              newWords: 0,
              practicedWords: 0,
              knownFromOtherTexts: 0,
              levelA1: 0,
              levelA2: 0,
              levelB1: 0,
              levelB2Plus: 0,
            },
        words,
      }
    })
  } catch (error) {
    console.error("Error fetching saved texts:", error)
    return []
  }
}

// Function to fetch a single saved text by ID
export async function fetchSavedTextById(textId: number, userId: string) {
  try {
    const text = await prisma.savedText.findFirst({
      where: {
              // @ts-ignore

        id: textId,
        userId,
      },
      include: {
        stats: true,
        extractedWords: {
          include: {
            verb: true,
            noun: true,
            adjective: true,
            // @ts-ignore
            practicedWords: {
              where: {
                userId: userId,
              },
            },
          },
        },
      },
    })

    if (!text) {
      return null
    }

    // Transform database model to application model
    // @ts-ignore
    const words = text.extractedWords.map((word) => ({
      id: Number(word.id),
      text: word.originalForm || word.baseForm,
      baseForm: word.baseForm,
      type: word.type,
      level: word.level || "Unknown",
      translation: word.translation || "",
      gender: word.gender,
      case: word.case,
      tense: word.tense,
      practiced: word.practicedWords.length > 0, // Check if this word has been practiced
      isNew: word.isNew,
      isRepeat: word.isRepeat || false, // Include the isRepeat flag
      appearsInOtherTexts: false, // This would need additional query
      occurrences: [
        {
          textTitle: text.title,
          date: text.dateAdded.toISOString(),
          sentence: word.sentence || "",
          translation: word.sentenceTranslation || "",
        },
      ],
      verbId: word.verbId,
      nounId: word.nounId,
      adjectiveId: word.adjectiveId,
    }))

    return {
      id: Number(text.id),
      title: text.title,
      level: text.level,
      dateAdded: text.dateAdded.toISOString(),
      excerpt: text.excerpt || "",
      wordCount: text.wordCount,
      readingTime: text.readingTime,
      content: text.content,
      // @ts-ignore
      stats: text.stats
        ? {
          // @ts-ignore
            totalWords: text.stats.totalWords,
            // @ts-ignore
            verbs: text.stats.verbs,
            // @ts-ignore
            nouns: text.stats.nouns,
            // @ts-ignore
            adjectives: text.stats.adjectives,
            // @ts-ignore
            adverbs: text.stats.adverbs,
            // @ts-ignore
            newWords: text.stats.newWords,
            // @ts-ignore
            practicedWords: text.stats.practicedWords,
            // @ts-ignore
            knownFromOtherTexts: text.stats.knownFromOtherTexts,
            // @ts-ignore
            levelA1: text.stats.levelA1,
            // @ts-ignore
            levelA2: text.stats.levelA2,
            // @ts-ignore
            levelB1: text.stats.levelB1,
            // @ts-ignore
            levelB2Plus: text.stats.levelB2Plus,
          }
        : {
            totalWords: 0,
            verbs: 0,
            nouns: 0,
            adjectives: 0,
            adverbs: 0,
            newWords: 0,
            practicedWords: 0,
            knownFromOtherTexts: 0,
            levelA1: 0,
            levelA2: 0,
            levelB1: 0,
            levelB2Plus: 0,
          },
      words,
    }
  } catch (error) {
    console.error("Error fetching saved text by ID:", error)
    return null
  }
}

// Function to mark a word as practiced
export async function markWordAsPracticed(wordId: number, userId: string) {
  try {
    // First check if this word is already practiced
    const existingPractice = await prisma.practicedWord.findFirst({
      where: {
        // @ts-ignore
        extractedWordId: wordId,
        userId,
      },
    })

    if (existingPractice) {
      // Update the last practiced date
      await prisma.practicedWord.update({
        where: {
          id: existingPractice.id,
        },
        data: {
          // @ts-ignore
          lastPracticedDate: new Date(),
          practiceCount: {
            increment: 1,
          },
        },
      })
    } else {
      // Create a new practiced word entry
      await prisma.practicedWord.create({
        data: {
          // @ts-ignore
          extractedWordId: wordId,
          userId,
          firstPracticedDate: new Date(),
          lastPracticedDate: new Date(),
          practiceCount: 1,
        },
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Error marking word as practiced:", error)
    return { success: false, error: "Failed to mark word as practiced" }
  }
}

// Function to get user's vocabulary statistics
export async function getVocabularyStats(userId: string) {
  try {
    const [verbCount, nounCount, adjectiveCount] = await Promise.all([
      prisma.verb.count({
        where: {
          extractedInTexts: {
            some: {
              savedText: {
                userId: userId
              }
            }
          }
        }
      }),
      prisma.noun.count({
        where: {
          extractedInTexts: {
            some: {
              savedText: {
                userId: userId
              }
            }
          }
        }
      }),
      prisma.adjective.count({
        where: {
          extractedInTexts: {
            some: {
              savedText: {
                userId: userId
              }
            }
          }
        }
      })
    ]);

    return {
      verbs: verbCount,
      nouns: nounCount,
      adjectives: adjectiveCount
    };
  } catch (error) {
    console.error("Error fetching vocabulary stats:", error);
    throw new Error("Failed to fetch vocabulary statistics");
  }
}

export async function getFrequencyDistribution(userId: string) {
  try {
    // Get all extracted words for the user
    const words = await prisma.extractedWord.findMany({
      where: {
        savedText: {
          userId,
        },
      },
      select: {
        id: true,
        baseForm: true, // Changed from 'text' to 'baseForm'
        type: true,
      },
    })

    // Count frequency ranges
    const frequencyCounts = {
      range50Plus: 0,
      range30to49: 0,
      range20to29: 0,
      range10to19: 0,
      range5to9: 0,
      range1to4: 0,
    }

    const wordCounts = new Map<string, number>()

    words.forEach((word) => {
      // Use baseForm instead of text
      const key = `${word.baseForm.toLowerCase()}_${word.type}`
      wordCounts.set(key, (wordCounts.get(key) || 0) + 1)
    })

    // Count words in each frequency range (rest remains the same)
    wordCounts.forEach((count) => {
      if (count >= 50) {
        frequencyCounts.range50Plus++
      } else if (count >= 30) {
        frequencyCounts.range30to49++
      } else if (count >= 20) {
        frequencyCounts.range20to29++
      } else if (count >= 10) {
        frequencyCounts.range10to19++
      } else if (count >= 5) {
        frequencyCounts.range5to9++
      } else {
        frequencyCounts.range1to4++
      }
    })

    return frequencyCounts
  } catch (error) {
    console.error("Error getting frequency distribution:", error)
    throw error
  }
}

export async function getDashboardData(userId: string) {
 
      try {
        // Get level distribution counts
        const levelCounts = await Promise.all([
          prisma.extractedWord.count({
            where: {
              level: 'A1',
              savedText: { userId }
            }
          }),
          prisma.extractedWord.count({
            where: {
              level: 'A2',
              savedText: { userId }
            }
          }),
          prisma.extractedWord.count({
            where: {
              level: 'B1',
              savedText: { userId }
            }
          }),
          prisma.extractedWord.count({
            where: {
              level: 'B2',
              savedText: { userId }
            }
          }),
          prisma.extractedWord.count({
            where: {
              level: 'C1',
              savedText: { userId }
            }
          }),
          prisma.extractedWord.count({
            where: {
              level: 'C2',
              savedText: { userId }
            }
          })
        ]);
    
    const stats = await getVocabularyStats(userId)
    const frequencyDistribution = await getFrequencyDistribution(userId)
    const [verbs, nouns, adjectives] = await Promise.all([
      prisma.verb.count({
        where: { extractedInTexts: { some: { savedText: { userId } } }
      }}),
      prisma.noun.count({
        where: { extractedInTexts: { some: { savedText: { userId } } }
      }}),
      prisma.adjective.count({
        where: { extractedInTexts: { some: { savedText: { userId } } }
      }})
    ])
    const totalWords = verbs + nouns + adjectives

    // Get recent texts
    const recentActivity = await prisma.extractedWord.findMany({
      where: { savedText: { userId } },
      // @ts-ignore
      orderBy: {  dateAdded: "desc"  },
      take: 10,
      select: {
        id: true,
        type: true,
        baseForm: true,
        level: true,
        // @ts-ignore
        dateAdded: true,
        savedText: { select: { title: true } }
      }
    })
    // Get recent texts
    const recentTexts = await prisma.savedText.findMany({
      where: { userId },
      orderBy: { dateAdded: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        excerpt: true,
        level: true,
        dateAdded: true,
      },
    })
    return {
      stats: {
        totalWords,
        verbs,
        nouns,
        adjectives,
        adverbs: 0, // Add actual implementation if needed
        levelA1: levelCounts[0],
        levelA2: levelCounts[1],
        levelB1: levelCounts[2],
        levelB2: levelCounts[3],
        levelC1: levelCounts[4],
        levelC2: levelCounts[5],
        practicedWords: 0, // Implement practice word count
        totalTexts: recentTexts.length,
        streak: 0, // Implement streak logic
        currentLevel: "A1", // Implement level calculation
        progressToNextLevel: 0, // Implement progress calculation
        recentActivity
      },
      frequencyDistribution,
      recentTexts
    }
  } catch (error) {
    console.error("Error getting dashboard data:", error)
    throw error
  }
}

// Add a function to check if a word exists in the database
export async function checkWordExists(baseForm: string, type: string): Promise<boolean> {
  try {
    if (type === "VERB") {
      const verb = await prisma.verb.findFirst({
        where: {
          baseForm: {
            equals: baseForm,
            mode: "insensitive",
          },
        },
      })
      return !!verb
    } else if (type === "NOUN") {
      const noun = await prisma.noun.findFirst({
        where: {
          baseForm: {
            equals: baseForm,
            mode: "insensitive",
          },
        },
      })
      return !!noun
    } else if (type === "ADJ") {
      const adjective = await prisma.adjective.findFirst({
        where: {
          baseForm: {
            equals: baseForm,
            mode: "insensitive",
          },
        },
      })
      return !!adjective
    }
    return false
  } catch (error) {
    console.error(`Error checking if ${type} ${baseForm} exists:`, error)
    return false
  }
}
