// Enhanced app/api/practice/get-available-options/route.ts with relationship support
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') // 'themes' or 'saved-texts'
    const categories = searchParams.get('categories')?.split(',') || []

    console.log(`Getting options for source: ${source}, categories: ${categories.join(',')}`)

    let availableLevels: string[] = []
    let availableThemes: Array<{ 
      name: string; 
      id?: string;
      wordCount: number; 
      levels: string[];
      description?: string;
      categoryBreakdown: Record<string, Record<string, number>>;
    }> = []

    if (source === 'themes') {
      // Enhanced: Query with relationships to get rich data
      const themesWithWords = await prisma.themeCategory.findMany({
        include: {
          words: {
            where: categories.length > 0 ? {
              type: { in: categories }
            } : undefined,
            select: {
              type: true,
              level: true,
              text: true,
              // Include related word data for richer information
              verb: {
                select: {
                  level: true,
                  baseForm: true
                }
              },
              noun: {
                select: {
                  level: true,
                  baseForm: true,
                  gender: true
                }
              },
              adjective: {
                select: {
                  level: true,
                  baseForm: true
                }
              },
              adverb: {
                select: {
                  level: true,
                  baseForm: true
                }
              }
            }
          }
        },
        where: {
          words: {
            some: categories.length > 0 ? {
              type: { in: categories }
            } : {}
          }
        }
      })

      console.log(`Found ${themesWithWords.length} themes with matching words`)

      const levelSet = new Set<string>()
      
      availableThemes = themesWithWords
        .map(theme => {
          console.log(`Processing theme: ${theme.name} with ${theme.words.length} words`)
          
          // Build category breakdown: category -> level -> count
          const categoryBreakdown: Record<string, Record<string, number>> = {}
          
          // Initialize all requested categories
          categories.forEach(category => {
            categoryBreakdown[category] = {}
          })
          
          // Count words by category and level
          theme.words.forEach(word => {
            // Prefer level from related word table, fallback to ThemeCategoryWord level
            let wordLevel = word.level
            
            // Get level from related word table if available (more authoritative)
            switch (word.type) {
              case 'VERB':
                if (word.verb?.level) wordLevel = word.verb.level
                break
              case 'NOUN':
                if (word.noun?.level) wordLevel = word.noun.level
                break
              case 'ADJECTIVE':
                if (word.adjective?.level) wordLevel = word.adjective.level
                break
              case 'ADVERB':
                if (word.adverb?.level) wordLevel = word.adverb.level
                break
            }
            
            if (wordLevel && categories.includes(word.type)) {
              levelSet.add(wordLevel)
              
              if (!categoryBreakdown[word.type][wordLevel]) {
                categoryBreakdown[word.type][wordLevel] = 0
              }
              categoryBreakdown[word.type][wordLevel]++
            }
          })

          // Get all levels available for this theme (prefer related word levels)
          const themeLevels = [...new Set(
            theme.words.map(w => {
              switch (w.type) {
                case 'VERB': return w.verb?.level || w.level
                case 'NOUN': return w.noun?.level || w.level
                case 'ADJECTIVE': return w.adjective?.level || w.level
                case 'ADVERB': return w.adverb?.level || w.level
                default: return w.level
              }
            }).filter(Boolean)
          )]
          
          const result = {
            name: theme.name,
            id: theme.id,
            wordCount: theme.words.length,
            levels: themeLevels,
            description: theme.description || undefined,
            categoryBreakdown
          }
          
          console.log(`Theme "${theme.name}" breakdown:`, categoryBreakdown)
          return result
        })
        .filter(theme => theme.wordCount > 0)

      availableLevels = Array.from(levelSet).sort((a, b) => {
        const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
        return levelOrder.indexOf(a) - levelOrder.indexOf(b)
      })

    } else if (source === 'saved-texts') {
      // Enhanced: For saved texts, get richer data through relationships
      const savedTextsWithWords = await prisma.savedText.findMany({
        where: {
          userId: session.user.id
        },
        include: {
          extractedWords: {
            where: categories.length > 0 ? {
              type: { in: categories }
            } : undefined,
            select: {
              type: true,
              level: true,
              baseForm: true,
              // Include related word data
              verb: {
                select: {
                  level: true,
                  baseForm: true
                }
              },
              noun: {
                select: {
                  level: true,
                  baseForm: true,
                  gender: true
                }
              },
              adjective: {
                select: {
                  level: true,
                  baseForm: true
                }
              },
              adverb: {
                select: {
                  level: true,
                  baseForm: true
                }
              }
            }
          }
        }
      })

      const levelSet = new Set<string>()
      
      availableThemes = savedTextsWithWords
        .map(text => {
          // Build category breakdown for extracted words
          const categoryBreakdown: Record<string, Record<string, number>> = {}
          
          categories.forEach(category => {
            categoryBreakdown[category] = {}
          })
          
          text.extractedWords.forEach(word => {
            // Prefer level from related word table
            let wordLevel = word.level
            
            switch (word.type) {
              case 'VERB':
                if (word.verb?.level) wordLevel = word.verb.level
                break
              case 'NOUN':
                if (word.noun?.level) wordLevel = word.noun.level
                break
              case 'ADJECTIVE':
                if (word.adjective?.level) wordLevel = word.adjective.level
                break
              case 'ADVERB':
                if (word.adverb?.level) wordLevel = word.adverb.level
                break
            }
            
            if (wordLevel && categories.includes(word.type)) {
              levelSet.add(wordLevel)
              
              if (!categoryBreakdown[word.type][wordLevel]) {
                categoryBreakdown[word.type][wordLevel] = 0
              }
              categoryBreakdown[word.type][wordLevel]++
            }
          })

          const textLevels = [...new Set(
            text.extractedWords.map(w => {
              switch (w.type) {
                case 'VERB': return w.verb?.level || w.level
                case 'NOUN': return w.noun?.level || w.level
                case 'ADJECTIVE': return w.adjective?.level || w.level
                case 'ADVERB': return w.adverb?.level || w.level
                default: return w.level
              }
            }).filter(Boolean)
          )]
          
          return {
            name: text.title,
            id: text.id.toString(),
            wordCount: text.extractedWords.length,
            levels: textLevels,
            categoryBreakdown
          }
        })
        .filter(text => text.wordCount > 0)

      availableLevels = Array.from(levelSet).sort((a, b) => {
        const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
        return levelOrder.indexOf(a) - levelOrder.indexOf(b)
      })
    }

    // Enhanced category statistics using both direct and relationship data
    const categoryStats = await getEnhancedCategoryStats(session.user.id, source, categories)

    console.log(`Returning ${availableLevels.length} levels and ${availableThemes.length} ${source}`)

    return NextResponse.json({
      success: true,
      availableLevels,
      availableThemes,
      categoryStats,
      source,
      selectedCategories: categories
    })

  } catch (error) {
    console.error('Error getting available options:', error)
    return NextResponse.json(
      { error: 'Failed to get available options' },
      { status: 500 }
    )
  }
}

// Enhanced stats that use both direct data and relationships
async function getEnhancedCategoryStats(userId: string, source: string, categories: string[]) {
  const stats: Record<string, { totalWords: number; levelDistribution: Record<string, number> }> = {}

  for (const category of categories) {
    try {
      if (source === 'themes') {
        // Get from ThemeCategoryWord with relationship data
        const themeWords = await prisma.themeCategoryWord.findMany({
          where: { type: category },
          select: { 
            level: true,
            verb: { select: { level: true } },
            noun: { select: { level: true } },
            adjective: { select: { level: true } },
            adverb: { select: { level: true } }
          }
        })

        const levelDist = themeWords.reduce((acc, word) => {
          // Prefer level from related word, fallback to direct level
          let wordLevel = word.level
          switch (category) {
            case 'VERB': if (word.verb?.level) wordLevel = word.verb.level; break
            case 'NOUN': if (word.noun?.level) wordLevel = word.noun.level; break
            case 'ADJECTIVE': if (word.adjective?.level) wordLevel = word.adjective.level; break
            case 'ADVERB': if (word.adverb?.level) wordLevel = word.adverb.level; break
          }
          
          const level = wordLevel || 'Unknown'
          acc[level] = (acc[level] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        stats[category] = {
          totalWords: themeWords.length,
          levelDistribution: levelDist
        }

      } else if (source === 'saved-texts') {
        // Get from ExtractedWord with relationship data
        const words = await prisma.extractedWord.findMany({
          where: {
            type: category,
            savedText: { userId }
          },
          select: { 
            level: true,
            verb: { select: { level: true } },
            noun: { select: { level: true } },
            adjective: { select: { level: true } },
            adverb: { select: { level: true } }
          }
        })

        const levelDist = words.reduce((acc, word) => {
          // Prefer level from related word, fallback to direct level
          let wordLevel = word.level
          switch (category) {
            case 'VERB': if (word.verb?.level) wordLevel = word.verb.level; break
            case 'NOUN': if (word.noun?.level) wordLevel = word.noun.level; break
            case 'ADJECTIVE': if (word.adjective?.level) wordLevel = word.adjective.level; break
            case 'ADVERB': if (word.adverb?.level) wordLevel = word.adverb.level; break
          }
          
          const level = wordLevel || 'Unknown'
          acc[level] = (acc[level] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        stats[category] = {
          totalWords: words.length,
          levelDistribution: levelDist
        }
      }
    } catch (error) {
      console.error(`Error getting stats for category ${category}:`, error)
      stats[category] = {
        totalWords: 0,
        levelDistribution: {}
      }
    }
  }

  return stats
}