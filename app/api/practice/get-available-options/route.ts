// Enhanced app/api/practice/get-available-options/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface ThemeInfo {
  name: string
  id?: string
  wordCount: number
  levels: string[]
  description?: string
  categoryBreakdown: Record<string, Record<string, number>> // category -> level -> count
}

interface CategoryStats {
  totalWords: number
  levelDistribution: Record<string, number>
  themeBreakdown?: Record<string, Record<string, number>> // theme -> level -> count
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') // 'themes' or 'saved-texts'
    const categories = searchParams.get('categories')?.split(',') || []
    const selectedLevel = searchParams.get('level') // Optional: specific level filter

    console.log(`Getting available options for source: ${source}, categories: ${categories.join(',')}, level: ${selectedLevel}`)

    let availableLevels: string[] = []
    let availableThemes: ThemeInfo[] = []

    if (source === 'themes') {
      // Get themes with detailed category breakdowns
      const themesWithWords = await prisma.themeCategory.findMany({
        include: {
          words: {
            where: categories.length > 0 ? {
              type: { in: categories }
            } : undefined,
            select: {
              type: true,
              level: true
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

      const levelSet = new Set<string>()
      
      availableThemes = themesWithWords
        .map(theme => {
          // Build category breakdown: category -> level -> count
          const categoryBreakdown: Record<string, Record<string, number>> = {}
          
          categories.forEach(category => {
            categoryBreakdown[category] = {}
            
            const categoryWords = theme.words.filter(w => w.type === category)
            categoryWords.forEach(word => {
              const level = word.level
              if (level) {
                levelSet.add(level)
                categoryBreakdown[category][level] = (categoryBreakdown[category][level] || 0) + 1
              }
            })
          })

          // Get all levels available for this theme
          const themeLevels = [...new Set(theme.words.map(w => w.level).filter(Boolean))]
          themeLevels.forEach(level => levelSet.add(level))

          return {
            name: theme.name,
            id: theme.id,
            wordCount: theme.words.length,
            levels: themeLevels,
            description: theme.description || undefined,
            categoryBreakdown
          }
        })
        .filter(theme => theme.wordCount > 0)

      // Also get levels from actual word tables for comprehensive coverage
      const additionalLevels = await getAvailableLevelsFromWordTables(categories)
      additionalLevels.forEach(level => levelSet.add(level))

      availableLevels = Array.from(levelSet).sort((a, b) => {
        const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
        return levelOrder.indexOf(a) - levelOrder.indexOf(b)
      })

    } else if (source === 'saved-texts') {
      // Get saved texts with detailed category breakdowns
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
              level: true
            }
          }
        }
      })

      const levelSet = new Set<string>()
      
      availableThemes = savedTextsWithWords
        .map(text => {
          // Build category breakdown: category -> level -> count
          const categoryBreakdown: Record<string, Record<string, number>> = {}
          
          categories.forEach(category => {
            categoryBreakdown[category] = {}
            
            const categoryWords = text.extractedWords.filter(w => w.type === category)
            categoryWords.forEach(word => {
              const level = word.level
              if (level) {
                levelSet.add(level)
                categoryBreakdown[category][level] = (categoryBreakdown[category][level] || 0) + 1
              }
            })
          })

          // Get all levels available for this text
          const textLevels = [...new Set(text.extractedWords.map(w => w.level).filter(Boolean))]
          textLevels.forEach(level => levelSet.add(level))

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

    // Get general category statistics (for fallback purposes)
    const categoryStats = await getCategoryStats(session.user.id, source, categories)

    console.log(`Found ${availableLevels.length} levels and ${availableThemes.length} themes/texts`)

    return NextResponse.json({
      success: true,
      availableLevels,
      availableThemes,
      categoryStats,
      source,
      selectedCategories: categories,
      selectedLevel
    })

  } catch (error) {
    console.error('Error getting available options:', error)
    return NextResponse.json(
      { error: 'Failed to get available options' },
      { status: 500 }
    )
  }
}

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

async function getCategoryStats(userId: string, source: string, categories: string[]) {
  const stats: Record<string, CategoryStats> = {}

  for (const category of categories) {
    try {
      if (source === 'themes') {
        // Get from ThemeCategoryWord table
        const themeWords = await prisma.themeCategoryWord.findMany({
          where: { type: category },
          select: { level: true, themeCategory: { select: { name: true } } }
        })

        // Also get from actual word tables for comprehensive coverage
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
          select: { level: true, savedText: { select: { title: true } } }
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