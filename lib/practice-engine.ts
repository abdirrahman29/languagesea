// AI Practice Engine - Core logic for adaptive German learning
import { prisma } from "@/lib/db"

export interface WordTarget {
  baseForm: string
  type: 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB'
  translation: string
  practiceCount: number
  lastPracticed?: Date
  isKnown: boolean
  familiarity: 'unknown' | 'learning' | 'familiar' | 'mastered'
  themes: string[]
}

export interface PracticeSession {
  id: string
  userId: string
  theme: string
  style: 'conversation' | 'article' | 'story'
  targetWords: WordTarget[]
  generatedContent: {
    german: string
    english: string
    words: Array<{
      word: string
      baseForm: string
      translation?: string
      isTarget: boolean
      position: { start: number; end: number }
    }>
  }
  userLevel: string
  difficulty: 'easy' | 'medium' | 'hard'
  createdAt: Date
}

export class PracticeEngine {
  constructor(private userId: string) {}

  /**
   * Get user's current learning level based on word knowledge
   */
  async getUserLevel(): Promise<string> {
    try {
      const stats = await prisma.extractedWord.groupBy({
        by: ['level'],
        where: {
          savedText: { userId: this.userId },
          isKnown: true
        },
        _count: { level: true }
      })

      const levelCounts = stats.reduce((acc, stat) => {
        acc[stat.level || 'A1'] = stat._count.level
        return acc
      }, {} as Record<string, number>)

      // Determine level based on known words distribution
      const totalKnown = Object.values(levelCounts).reduce((sum, count) => sum + count, 0)
      
      if (totalKnown < 50) return 'A1'
      if (levelCounts['B1'] > 50 || levelCounts['B2'] > 30) return 'B1'
      if (levelCounts['A2'] > 100) return 'A2'
      
      return 'A1' // Default
    } catch (error) {
      console.error('Error getting user level:', error)
      return 'A1'
    }
  }

  /**
   * Select target words for practice based on spaced repetition and themes
   */
  async selectTargetWords(theme: string, count: number = 6): Promise<WordTarget[]> {
    console.log('Selecting words for theme:', theme)
  
    try {
      // First, find the exact theme by name
      let themeCategory = await prisma.themeCategory.findFirst({
        where: {
          name: { equals: theme, mode: 'insensitive' }
        }
      })

      // If not found, try partial matching
      if (!themeCategory) {
        themeCategory = await prisma.themeCategory.findFirst({
          where: {
            name: { contains: theme, mode: 'insensitive' }
          }
        })
      }

      // If still not found, try searching within theme words themselves
      if (!themeCategory) {
        const themeWords = theme.toLowerCase().split(/[\s&,]+/).filter(word => word.length > 2)
        
        themeCategory = await prisma.themeCategory.findFirst({
          where: {
            OR: themeWords.map(word => ({
              name: { contains: word, mode: 'insensitive' }
            }))
          }
        })
      }

      // Last resort: get the first available theme with enough words
      if (!themeCategory) {
        console.log('No exact theme match found, using most populated theme')
        themeCategory = await prisma.themeCategory.findFirst({
          include: {
            _count: {
              select: { words: true }
            }
          },
          where: {
            words: {
              some: {} // Ensure theme has at least some words
            }
          },
          orderBy: {
            words: {
              _count: 'desc'
            }
          }
        })
      }
    
      if (!themeCategory) {
        console.log('No theme categories found in database at all')
        return await this.getFallbackWords(count)
      }
    
      console.log('Using theme category:', themeCategory.name)
    
      // Get words from that theme
      const themeWords = await prisma.themeCategoryWord.findMany({
        where: {
          themeCategoryId: themeCategory.id
        },
        take: Math.min(50, count * 3) // Get more words than needed for better selection
      })
    
      console.log('Found theme words:', themeWords.length)
      
      if (themeWords.length === 0) {
        console.log('No words found for theme category')
        return await this.getFallbackWords(count)
      }
    
      // Get user's practice history for these words
      const practiceHistory = await prisma.practicedWord.findMany({
        where: {
          userId: this.userId,
          baseForm: { in: themeWords.map(w => w.text) }
        }
      })

      // Convert to practice history map
      const practiceMap = new Map(
        practiceHistory.map(p => [
          `${p.baseForm}-${p.type}`, 
          {
            count: p.timesCorrect + p.timesWrong,
            lastPracticed: p.lastPracticed,
            accuracy: p.timesCorrect / (p.timesCorrect + p.timesWrong) || 0
          }
        ])
      )

      // Score words for practice priority
      const scoredWords = themeWords.map(word => {
        const key = `${word.text}-${word.type}`
        const practice = practiceMap.get(key)
        
        let priority = 10 // Base priority
        
        if (!practice) {
          priority += 20 // Never practiced - highest priority
        } else {
          // Lower priority for recently practiced words
          const daysSince = practice.lastPracticed 
            ? (Date.now() - practice.lastPracticed.getTime()) / (1000 * 60 * 60 * 24)
            : 999
            
          if (daysSince < 1) priority -= 15
          else if (daysSince < 3) priority -= 10
          else if (daysSince < 7) priority -= 5
          
          // Lower priority for well-practiced words
          if (practice.count > 5 && practice.accuracy > 0.8) {
            priority -= 10
          }
          
          // Boost priority for words that were practiced but with low accuracy
          if (practice.count > 0 && practice.accuracy < 0.5) {
            priority += 10
          }
        }

        return {
          word,
          practice: practice || { count: 0, lastPracticed: null, accuracy: 0 },
          priority
        }
      })

      // Sort by priority and take top words, ensuring we don't exceed available words
      const availableWordsCount = Math.min(scoredWords.length, count)
      const selectedWords = scoredWords
        .sort((a, b) => b.priority - a.priority)
        .slice(0, availableWordsCount)
        .map(({ word, practice }) => ({
          baseForm: word.text,
          type: word.type as 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB',
          translation: word.translation,
          practiceCount: practice.count,
          lastPracticed: practice.lastPracticed || undefined,
          isKnown: practice.count >= 3 && practice.accuracy > 0.7,
          familiarity: this.getFamiliarityLevel(practice.count, practice.accuracy),
          themes: [theme]
        }))

      // If we have fewer words than requested, try to get familiar words to fill the gap
      if (selectedWords.length < count) {
        const familiarWordsNeeded = count - selectedWords.length
        const familiarWords = await this.getFamiliarWords(theme, familiarWordsNeeded)
        selectedWords.push(...familiarWords)
      }

      console.log(`Selected ${selectedWords.length} words for practice`)
      return selectedWords

    } catch (error) {
      console.error('Error in selectTargetWords:', error)
      return await this.getFallbackWords(count)
    }
  }

  /**
   * Get familiar words to provide context in practice
   */
  private async getFamiliarWords(theme: string, count: number): Promise<WordTarget[]> {
    try {
      const familiarWords = await prisma.practicedWord.findMany({
        where: {
          userId: this.userId,
          timesCorrect: { gte: 2 },
          OR: [
            { lastPracticed: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // Last 30 days
            { lastPracticed: null }
          ]
        },
        take: count,
        orderBy: { lastPracticed: 'desc' }
      })

      return familiarWords.map(word => ({
        baseForm: word.baseForm,
        type: word.type as 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB',
        translation: '', // We'll try to get this from the word tables
        practiceCount: word.timesCorrect + word.timesWrong,
        lastPracticed: word.lastPracticed || undefined,
        isKnown: true,
        familiarity: 'familiar' as const,
        themes: [theme]
      }))
    } catch (error) {
      console.error('Error getting familiar words:', error)
      return []
    }
  }

  /**
   * Fallback method to get words when no theme-specific words are available
   */
  private async getFallbackWords(count: number): Promise<WordTarget[]> {
    try {
      console.log('Using fallback words from any available theme')
      
      // Get words from any theme category
      const fallbackWords = await prisma.themeCategoryWord.findMany({
        take: count * 2, // Get more than needed for better selection
        orderBy: {
          text: 'asc' // Simple ordering
        }
      })

      if (fallbackWords.length === 0) {
        console.log('No words found in any theme category')
        return []
      }

      // Convert to WordTarget format
      return fallbackWords.slice(0, count).map(word => ({
        baseForm: word.text,
        type: word.type as 'VERB' | 'NOUN' | 'ADJ' | 'ADVERB',
        translation: word.translation,
        practiceCount: 0,
        isKnown: false,
        familiarity: 'unknown' as const,
        themes: ['General']
      }))

    } catch (error) {
      console.error('Error getting fallback words:', error)
      return []
    }
  }

  /**
   * Determine word familiarity level
   */
  private getFamiliarityLevel(practiceCount: number, accuracy: number): WordTarget['familiarity'] {
    if (practiceCount === 0) return 'unknown'
    if (practiceCount < 3) return 'learning'
    if (practiceCount < 6 || accuracy < 0.8) return 'familiar'
    return 'mastered'
  }

  /**
   * Create a new practice session
   */
  async createPracticeSession(
    theme: string, 
    style: PracticeSession['style'],
    wordCount: number = 6
  ): Promise<Omit<PracticeSession, 'generatedContent'>> {
    try {
      const userLevel = await this.getUserLevel()
      const targetWords = await this.selectTargetWords(theme, wordCount)
      
      if (targetWords.length === 0) {
        throw new Error('No words available for practice. Please check your theme data.')
      }

      const session: Omit<PracticeSession, 'generatedContent'> = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.userId,
        theme,
        style,
        targetWords,
        userLevel,
        difficulty: this.calculateDifficulty(targetWords),
        createdAt: new Date()
      }

      console.log(`Created session with ${targetWords.length} target words`)
      return session

    } catch (error) {
      console.error('Error creating practice session:', error)
      throw error
    }
  }

  /**
   * Calculate session difficulty based on target words
   */
  private calculateDifficulty(words: WordTarget[]): 'easy' | 'medium' | 'hard' {
    if (words.length === 0) return 'easy'
    
    const unknownCount = words.filter(w => w.familiarity === 'unknown').length
    const totalWords = words.length

    const unknownRatio = unknownCount / totalWords

    if (unknownRatio > 0.6) return 'hard'
    if (unknownRatio > 0.3) return 'medium'
    return 'easy'
  }

  /**
   * Update word practice stats after quiz
   */
  async updateWordPractice(
    baseForm: string,
    type: WordTarget['type'],
    isCorrect: boolean
  ): Promise<void> {
    try {
      await prisma.practicedWord.upsert({
        where: {
          userId_baseForm_type: {
            userId: this.userId,
            baseForm,
            type
          }
        },
        update: {
          timesCorrect: isCorrect ? { increment: 1 } : undefined,
          timesWrong: !isCorrect ? { increment: 1 } : undefined,
          lastPracticed: new Date(),
          practiced: true
        },
        create: {
          userId: this.userId,
          baseForm,
          type,
          timesCorrect: isCorrect ? 1 : 0,
          timesWrong: !isCorrect ? 1 : 0,
          lastPracticed: new Date(),
          practiced: true
        }
      })
    } catch (error) {
      console.error('Error updating word practice:', error)
      throw error
    }
  }

  /**
   * Get available themes for practice
   */
  async getAvailableThemes(): Promise<Array<{ name: string; wordCount: number }>> {
    try {
      const themes = await prisma.themeCategory.findMany({
        include: {
          _count: {
            select: { words: true }
          }
        },
        orderBy: {
          name: 'asc'
        }
      })

      return themes
        .filter(theme => theme._count.words > 0) // Only include themes with words
        .map(theme => ({
          name: theme.name,
          wordCount: theme._count.words
        }))
    } catch (error) {
      console.error('Error getting available themes:', error)
      return []
    }
  }

  /**
   * Generate quiz options for a word
   */
  async generateQuizOptions(targetWord: WordTarget): Promise<{
    question: string
    options: Array<{ id: string; text: string; isCorrect: boolean }>
  }> {
    try {
      // Get similar words from the same type for distractors
      const distractors = await prisma.themeCategoryWord.findMany({
        where: {
          type: targetWord.type,
          NOT: { text: targetWord.baseForm }
        },
        take: 3,
        orderBy: {
          text: 'asc'
        }
      })

      // If we don't have enough distractors from the same type, get from any type
      if (distractors.length < 3) {
        const additionalDistractors = await prisma.themeCategoryWord.findMany({
          where: {
            NOT: { text: targetWord.baseForm }
          },
          take: 3 - distractors.length,
          orderBy: {
            text: 'asc'
          }
        })
        distractors.push(...additionalDistractors)
      }

      const options = [
        {
          id: 'correct',
          text: targetWord.translation,
          isCorrect: true
        },
        ...distractors.map((word, index) => ({
          id: `distractor_${index}`,
          text: word.translation,
          isCorrect: false
        }))
      ]

      // Shuffle options
      const shuffledOptions = options.sort(() => Math.random() - 0.5)

      return {
        question: `What does "${targetWord.baseForm}" mean?`,
        options: shuffledOptions
      }
    } catch (error) {
      console.error('Error generating quiz options:', error)
      
      // Fallback options
      return {
        question: `What does "${targetWord.baseForm}" mean?`,
        options: [
          { id: 'correct', text: targetWord.translation, isCorrect: true },
          { id: 'wrong1', text: 'Option 1', isCorrect: false },
          { id: 'wrong2', text: 'Option 2', isCorrect: false },
          { id: 'wrong3', text: 'Option 3', isCorrect: false }
        ].sort(() => Math.random() - 0.5)
      }
    }
  }
}