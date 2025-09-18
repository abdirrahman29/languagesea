// New API endpoint: app/api/practice/get-available-options/route.ts
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
      // Get levels and themes from ThemeCategory and ThemeCategoryWord
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

      // Extract unique levels across all saved texts
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

// Helper function to get category-specific statistics
async function getCategoryStats(userId: string, source: string, categories: string[]) {
  const stats: Record<string, { totalWords: number; levelDistribution: Record<string, number> }> = {}

  for (const category of categories) {
    if (source === 'themes') {
      const words = await prisma.themeCategoryWord.findMany({
        where: { type: category },
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
  }

  return stats
}