// Fixed app/api/practice/get-available-options/route.ts
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

    console.log(`Getting available options for source: ${source}, categories: ${categories.join(',')}`)

    let availableLevels: string[] = []
    let availableThemes: Array<{ name: string; wordCount: number; levels: string[] }> = []

    if (source === 'themes') {
      // FIXED: Query actual word tables instead of just ThemeCategoryWord
      const themesWithWords = await prisma.themeCategory.findMany({
        include: {
          words: {
            where: categories.length > 0 ? {
              type: { in: categories }
            } : undefined,
            select: {
              level: true,
              type: true
            }
          },
          _count: {
            select: {
              words: {
                where: categories.length > 0 ? {
                  type: { in: categories }
                } : undefined
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

      // Extract unique levels across all themes
      const levelSet = new Set<string>()
      
      availableThemes = themesWithWords
        .filter(theme => theme._count.words > 0)
        .map(theme => {
          const themeLevels = [...new Set(theme.words.map(w => w.level).filter(Boolean))]
          themeLevels.forEach(level => levelSet.add(level))
          
          return {
            name: theme.name,
            wordCount: theme._count.words,
            levels: themeLevels,
            description: theme.description || undefined
          }
        })

      // FIXED: Also get levels directly from word tables
      const additionalLevels = await getAvailableLevelsFromWordTables(categories)
      additionalLevels.forEach(level => levelSet.add(level))

      availableLevels = Array.from(levelSet).sort((a, b) => {
        const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
        return levelOrder.indexOf(a) - levelOrder.indexOf(b)
      })

    } else if (source === 'saved-texts') {
      // Get levels and themes from user's saved texts and extracted words
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
              level: true,
              type: true
            }
          },
          _count: {
            select: {
              extractedWords: {
                where: categories.length > 0 ? {
                  type: { in: categories }
                } : undefined
              }
            }
          }
        }
      })

      const levelSet = new Set<string>()
      
      availableThemes = savedTextsWithWords
        .filter(text => text._count.extractedWords > 0)
        .map(text => {
          const textLevels = [...new Set(text.extractedWords.map(w => w.level).filter(Boolean))]
          textLevels.forEach(level => levelSet.add(level))
          
          return {
            name: text.title,
            wordCount: text._count.extractedWords,
            levels: textLevels,
            id: text.id.toString()
          }
        })

      availableLevels = Array.from(levelSet).sort((a, b) => {
        const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
        return levelOrder.indexOf(a) - levelOrder.indexOf(b)
      })
    }

    // Get category-specific statistics for better filtering
    const categoryStats = await getCategoryStats(session.user.id, source, categories)

    console.log(`Found ${availableLevels.length} levels and ${availableThemes.length} themes/texts`)

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

// FIXED: New function to get levels directly from word tables
async function getAvailableLevelsFromWordTables(categories: string[]) {
  const levels = new Set<string>()

  for (const category of categories) {
    try {
      switch (category) {
        case 'VERB':
          const verbs = await prisma.verb.findMany({
            select: { level: true },
            distinct: ['level']
          })
          verbs.forEach(v => levels.add(v.level))
          break

        case 'NOUN':
          const nouns = await prisma.noun.findMany({
            select: { level: true },
            distinct: ['level']
          })
          nouns.forEach(n => levels.add(n.level))
          break

        case 'ADJ':
          const adjectives = await prisma.adjective.findMany({
            select: { level: true },
            distinct: ['level']
          })
          adjectives.forEach(a => levels.add(a.level))
          break

        case 'ADVERB':
          const adverbs = await prisma.adverb.findMany({
            select: { level: true },
            distinct: ['level']
          })
          adverbs.forEach(a => levels.add(a.level))
          break
      }
    } catch (error) {
      console.error(`Error getting levels for category ${category}:`, error)
    }
  }

  return Array.from(levels)
}

// FIXED: Helper function to get category-specific statistics from actual word tables
async function getCategoryStats(userId: string, source: string, categories: string[]) {
  const stats: Record<string, { totalWords: number; levelDistribution: Record<string, number> }> = {}

  for (const category of categories) {
    try {
      if (source === 'themes') {
        // First try ThemeCategoryWord
        const themeWords = await prisma.themeCategoryWord.findMany({
          where: { type: category },
          select: { level: true }
        })

        // FIXED: Also get from actual word tables
        let actualWords: Array<{ level: string }> = []
        
        switch (category) {
          case 'VERB':
            actualWords = await prisma.verb.findMany({
              select: { level: true }
            })
            break
          case 'NOUN':
            actualWords = await prisma.noun.findMany({
              select: { level: true }
            })
            break
          case 'ADJ':
            actualWords = await prisma.adjective.findMany({
              select: { level: true }
            })
            break
          case 'ADVERB':
            actualWords = await prisma.adverb.findMany({
              select: { level: true }
            })
            break
        }

        // Combine theme words and actual words
        const allWords = [...themeWords, ...actualWords]

        const levelDist = allWords.reduce((acc, word) => {
          const level = word.level || 'Unknown'
          acc[level] = (acc[level] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        stats[category] = {
          totalWords: allWords.length,
          levelDistribution: levelDist
        }

      } else if (source === 'saved-texts') {
        const words = await prisma.extractedWord.findMany({
          where: {
            type: category,
            savedText: { userId }
          },
          select: { level: true }
        })

        const levelDist = words.reduce((acc, word) => {
          const level = word.level || 'Unknown'
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